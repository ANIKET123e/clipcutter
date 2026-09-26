import ffmpeg from 'fluent-ffmpeg';
import { Errors } from '@/lib/errors';

export interface ProbeResult {
  durationSec: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  bitrateKbps: number | null;
  container: string | null;
}

/** Runs ffprobe against a local file path. Never receives raw user strings as shell input. */
export function probeMedia(localPath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(localPath, (err, data) => {
      if (err) return reject(Errors.processingFailed());

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      const audioStream = data.streams.find((s) => s.codec_type === 'audio');
      const duration = Number(data.format.duration ?? videoStream?.duration ?? 0);

      let fps: number | null = null;
      if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (den) fps = num / den;
      }

      resolve({
        durationSec: duration,
        width: videoStream?.width ?? null,
        height: videoStream?.height ?? null,
        fps,
        videoCodec: videoStream?.codec_name ?? null,
        audioCodec: audioStream?.codec_name ?? null,
        bitrateKbps: data.format.bit_rate ? Math.round(Number(data.format.bit_rate) / 1000) : null,
        container: data.format.format_name ?? null
      });
    });
  });
}

export interface CutParams {
  inputPath: string;
  outputPath: string;
  startSec: number;
  endSec: number;
  cutMode: 'FAST_COPY' | 'FRAME_ACCURATE';
  outputFormat: 'MP4' | 'WEBM' | 'MP3' | 'M4A' | 'OGG' | 'OPUS';
  onProgress?: (percent: number) => void;
}

const AUDIO_ONLY_FORMATS = new Set(['MP3', 'M4A', 'OGG', 'OPUS']);

/**
 * Builds and runs the ffmpeg command using fluent-ffmpeg's structured API only —
 * every value is passed as a discrete argument, never concatenated into a shell
 * string, so there is no path for command injection regardless of file names.
 *
 * Returns whether the output was actually stream-copied (true "No Re-Encoding")
 * or re-encoded, so the UI never claims a mode that didn't really happen.
 */
export function cutMedia(params: CutParams): Promise<{ wasReencoded: boolean }> {
  const duration = params.endSec - params.startSec;
  const isAudioOutput = AUDIO_ONLY_FORMATS.has(params.outputFormat);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(params.inputPath).setStartTime(params.startSec).setDuration(duration);

    let wasReencoded = true;

    if (isAudioOutput) {
      command.noVideo();
      switch (params.outputFormat) {
        case 'MP3':
          command.audioCodec('libmp3lame').format('mp3');
          break;
        case 'M4A':
          command.audioCodec('aac').format('ipod');
          break;
        case 'OGG':
          command.audioCodec('libvorbis').format('ogg');
          break;
        case 'OPUS':
          command.audioCodec('libopus').format('opus');
          break;
      }
    } else if (params.cutMode === 'FAST_COPY') {
      // Stream copy: fastest, lossless, but only frame-accurate at the nearest keyframe.
      command.videoCodec('copy').audioCodec('copy');
      if (params.outputFormat === 'MP4') command.format('mp4').outputOptions(['-movflags', '+faststart']);
      if (params.outputFormat === 'WEBM') command.format('webm');
      wasReencoded = false;
    } else {
      // Frame accurate: re-encode so the exact requested start/end is honored.
      command.videoCodec(params.outputFormat === 'WEBM' ? 'libvpx-vp9' : 'libx264').audioCodec(params.outputFormat === 'WEBM' ? 'libopus' : 'aac');
      if (params.outputFormat === 'MP4') command.format('mp4').outputOptions(['-movflags', '+faststart', '-preset', 'veryfast', '-crf', '18']);
      if (params.outputFormat === 'WEBM') command.format('webm').outputOptions(['-crf', '30', '-b:v', '0']);
      wasReencoded = true;
    }

    command
      .on('progress', (progress) => {
        if (params.onProgress && progress.percent != null) {
          params.onProgress(Math.max(0, Math.min(100, Math.round(progress.percent))));
        }
      })
      .on('error', () => reject(Errors.processingFailed()))
      .on('end', () => resolve({ wasReencoded }))
      .save(params.outputPath);
  });
}
