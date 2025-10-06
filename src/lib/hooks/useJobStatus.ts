import { useState, useEffect, useCallback } from 'react';

export interface JobStatus {
  jobId: string;
  queueJobId?: string;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  state?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
}

interface UseJobStatusOptions {
  enabled?: boolean;
  pollingInterval?: number; // en millisecondes
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
) {
  const {
    enabled = true,
    pollingInterval = 1000,
    onComplete,
    onError
  } = options;

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Job non trouvé');
          return;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setJobStatus(data);

      // Appeler les callbacks si définis
      if (data.status === 'COMPLETED' && data.result && onComplete) {
        onComplete(data.result);
      }

      if (data.status === 'FAILED' && data.error && onError) {
        onError(data.error);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur lors de la récupération du statut du job:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, enabled, onComplete, onError]);

  // Polling automatique
  useEffect(() => {
    if (!jobId || !enabled) return;

    // Premier fetch immédiat
    fetchJobStatus();

    // Polling interval
    const interval = setInterval(fetchJobStatus, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchJobStatus, pollingInterval]);

  const refresh = useCallback(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  return {
    jobStatus,
    isLoading,
    error,
    refresh,
    // États calculés pour plus de commodité
    isPending: jobStatus?.status === 'PENDING',
    isProcessing: jobStatus?.status === 'PROCESSING',
    isCompleted: jobStatus?.status === 'COMPLETED',
    isFailed: jobStatus?.status === 'FAILED',
    progress: jobStatus?.progress || 0,
  };
}
