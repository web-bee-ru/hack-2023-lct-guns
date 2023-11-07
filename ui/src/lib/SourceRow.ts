import { GunsAPI } from '../generated/GunsAPI';
import { useQuery } from 'react-query';
import { taxiosGuns } from '../api';

export enum SourceRowKind {
  Camera = 'Camera',
  Video = 'Video',
}
export interface SourceRowBase {
  uid: string;
  kind: SourceRowKind;
}

export interface CameraSourceRow extends SourceRowBase {
  kind: SourceRowKind.Camera;
  source: GunsAPI.CameraSource;
}

export interface VideoSourceRow extends SourceRowBase {
  kind: SourceRowKind.Video;
  source: GunsAPI.VideoSource;
}

export type SourceRow = CameraSourceRow | VideoSourceRow;

export function useSources() {
  const rows = useQuery('sources', async () => {
    const videoSourcesPromise = taxiosGuns.$get('/v1/video-sources');
    const cameraSourcesPromise = taxiosGuns.$get('/v1/camera-sources');

    const videoSources = await videoSourcesPromise;
    const cameraSources = await cameraSourcesPromise;

    const rows: SourceRow[] = [];
    for (const source of videoSources) {
      rows.push({ uid: `Video-${source.id}`, kind: SourceRowKind.Video, source });
    }
    for (const source of cameraSources) {
      rows.push({ uid: `Camera-${source.id}`, kind: SourceRowKind.Camera, source });
    }
    return rows;
  });
  return rows;
}
