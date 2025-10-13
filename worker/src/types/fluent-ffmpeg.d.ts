declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    videoCodec(codec: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    videoBitrate(bitrate: string): FfmpegCommand;
    audioBitrate(bitrate: string): FfmpegCommand;
    size(size: string): FfmpegCommand;
    setStartTime(seconds: number): FfmpegCommand;
    setDuration(seconds: number): FfmpegCommand;
    videoFilter(filter: string): FfmpegCommand;
    output(outputPath: string): FfmpegCommand;
    on(event: 'end', listener: () => void): FfmpegCommand;
    on(event: 'error', listener: (err: Error) => void): FfmpegCommand;
    on(event: 'progress', listener: (progress: { percent: number }) => void): FfmpegCommand;
    run(): void;
  }

  interface FFprobeStream {
    codec_type: string;
    width?: number;
    height?: number;
  }

  interface FFprobeFormat {
    duration?: number;
    format_name?: string;
  }

  interface FFprobeResult {
    streams: FFprobeStream[];
    format: FFprobeFormat;
  }

  function ffmpeg(inputPath: string): FfmpegCommand;

  namespace ffmpeg {
    function ffprobe(filePath: string, callback: (err: Error | null, metadata: FFprobeResult) => void): void;
  }

  export = ffmpeg;
}
