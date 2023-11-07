import { Taxios } from '@simplesmiler/taxios';
import { default as defaultAxios } from 'axios';
import { GunsAPI } from '../generated/GunsAPI';
import { QueryClient } from 'react-query';

export const axios = defaultAxios.create({
  baseURL: '/api/guns',
});

export const taxiosGuns = new Taxios<GunsAPI>(axios);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

export function makeHlsHref(source: GunsAPI.CameraSource): string {
  return `/hls/${source.mmtx_name}/index.m3u8`;
}

export function makeS3Href(source: GunsAPI.VideoSource): string {
  return `/s3/${source.file.s3_bucket}/${source.file.s3_key}`;
}
