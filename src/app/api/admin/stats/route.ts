import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/api-utils';
import os from 'os';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache en mémoire pour les métriques système (30 secondes)
let systemMetricsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30 secondes en millisecondes

// Fonction pour récupérer les vraies informations système
async function getRealSystemMetrics() {
  const now = Date.now();

  // Vérifier si le cache est valide
  if (systemMetricsCache && (now - systemMetricsCache.timestamp) < CACHE_TTL) {
    return systemMetricsCache.data;
  }

  try {
    // Récupérer les informations de stockage avec df
    let storageInfo = { total: 50, used: 10 }; // valeurs par défaut en GB

    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const { stdout } = await execAsync('df / | tail -1 | awk \'{print $2, $3}\'');
        const [totalBlocks, usedBlocks] = stdout.trim().split(/\s+/).map(Number);

        if (totalBlocks && usedBlocks) {
          // Convertir de blocs 1K en GB
          storageInfo = {
            total: Math.round(totalBlocks / 1024 / 1024),
            used: Math.round(usedBlocks / 1024 / 1024)
          };
        }
      }
    } catch (error) {
      console.warn('Impossible de récupérer les informations de stockage via df:', error);
    }

    // Récupérer l'utilisation mémoire détaillée
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

    // Récupérer l'utilisation CPU via /proc/loadavg (Linux) ou équivalent
    let cpuUsagePercent = 0;
    try {
      if (process.platform === 'linux') {
        const { stdout: loadAvg } = await execAsync('cat /proc/loadavg');
        const loadValues = loadAvg.trim().split(/\s+/);
        const oneMinuteLoad = parseFloat(loadValues[0]);
        const cpuCount = os.cpus().length;
        cpuUsagePercent = Math.round(Math.min((oneMinuteLoad / cpuCount) * 100, 100));
      } else {
        // Approximation basée sur la charge système pour d'autres plateformes
        const loadAverage = os.loadavg();
        cpuUsagePercent = Math.round(Math.min(loadAverage[0] * 100 / os.cpus().length, 100));
      }
    } catch (error) {
      console.warn('Impossible de récupérer l\'utilisation CPU:', error);
      const loadAverage = os.loadavg();
      cpuUsagePercent = Math.round(Math.min(loadAverage[0] * 100 / os.cpus().length, 100));
    }

    const storageUsagePercent = Math.round((storageInfo.used / storageInfo.total) * 100);

    const metrics = {
      cpu: Math.max(0, Math.min(100, cpuUsagePercent)),
      memory: Math.max(0, Math.min(100, memoryUsagePercent)),
      storage: Math.max(0, Math.min(100, storageUsagePercent)),
      storageDetails: {
        used: storageInfo.used,
        total: storageInfo.total,
        unit: 'GB'
      },
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      platform: process.platform,
      arch: process.arch,
    };

    // Mettre en cache
    systemMetricsCache = {
      data: metrics,
      timestamp: now
    };

    return metrics;
  } catch (error) {
    console.error('Erreur lors de la récupération des métriques système:', error);

    // Fallback avec les informations de base d'OS
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

    const loadAverage = os.loadavg();
    const cpuUsagePercent = Math.round(Math.min(loadAverage[0] * 100 / os.cpus().length, 100));

    return {
      cpu: Math.max(0, Math.min(100, cpuUsagePercent)),
      memory: Math.max(0, Math.min(100, memoryUsagePercent)),
      storage: 0, // Non disponible en cas d'erreur
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      platform: process.platform,
      arch: process.arch,
    };
  }
}

// Handler interne pour la logique métier (sans authentification)
async function getAdminStatsHandler(request: AuthenticatedRequest) {
  // Récupérer les statistiques
  const [
    totalUsers,
    totalGalleries,
    totalImages,
    totalPublications,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.gallery.count(),
    prisma.image.count(),
    prisma.publication.count(),
    prisma.job.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true },
        },
      },
    }),
  ]);

  // Récupérer les vraies informations système avec cache
  const systemHealth = await getRealSystemMetrics();

  // Formater l'activité récente
  const formattedActivity = recentActivity.map((activity: any) => ({
    id: activity.id,
    type: `${activity.type} - ${activity.status}`,
    userId: activity.user.id,
    createdAt: activity.createdAt.toISOString(),
  }));

  const stats = {
    totalUsers,
    totalGalleries,
    totalImages,
    totalPublications,
    systemHealth,
    recentActivity: formattedActivity,
  };

  return NextResponse.json({ stats }, { status: 200 });
}

// GET /api/admin/stats - Récupérer les statistiques système (avec authentification HOF)
export const GET = withAuth(getAdminStatsHandler, 'ADMIN');
