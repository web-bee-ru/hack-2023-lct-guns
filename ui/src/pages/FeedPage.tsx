import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from 'react-query';
import { makeHlsHref, makeS3Href, taxiosGuns } from '../api';
import React from 'react';
import { SourceRow, SourceRowKind, useSources } from '../lib/SourceRow';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';
import { Box, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select } from '@mui/material';
import { GunsAPI } from '../generated/GunsAPI';
import { max } from 'lodash';
import Hls from 'hls.js';
import { minConfidenceAtom } from '../state';
import { useAtom } from 'jotai';

export const FeedPage: React.FC = () => {
  const sources = useSources();
  if (sources.data == null) return <CircularProgress />;
  else return <FeedPageGuarded sources={sources.data}></FeedPageGuarded>;
};

interface FeedPageGuardedProps {
  sources: SourceRow[];
}
const FeedPageGuarded: React.FC<FeedPageGuardedProps> = (props) => {
  const { sources } = props;

  const [searchParams, setSearchParams] = useSearchParams();

  const sourceLut = React.useMemo(() => {
    return new Map(sources.map((it) => [it.uid, it]));
  }, [sources]);

  const [activeSourceUid, setActiveSourceUid] = React.useState<SourceRow['uid'] | null>(() => {
    const uid = searchParams.get('source');
    if (uid == null) return null;
    const source = sourceLut.get(uid);
    if (source == null) return null;
    return source.uid;
  });
  const activeSource = React.useMemo(() => {
    if (activeSourceUid == null) return null;
    return sourceLut.get(activeSourceUid) ?? null;
  }, [activeSourceUid, sources]);
  const changeSource = React.useCallback(
    (ev: SelectChangeEvent<string | null>) => {
      const uid = String(ev.target.value);
      if (uid == null) return;
      const source = sourceLut.get(uid);
      if (!source) return;
      setSearchParams({ source: source.uid });
      setActiveSourceUid(source.uid);
    },
    [setSearchParams, sourceLut],
  );

  return (
    <Box display="flex" flexDirection="column" sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', mt: 2, mx: 1 }}>
        <FormControl sx={{ flexBasis: 120, flex: 1 }}>
          <InputLabel size="small" id="active_source_label">
            Источник
          </InputLabel>
          {/*<Input id="my-input" aria-describedby="my-helper-text" />*/}
          <Select<string>
            size="small"
            labelId="active_source_label"
            label="Источник"
            id="active_source"
            value={activeSourceUid ?? undefined}
            onChange={changeSource}
          >
            {sources.map((source) => (
              <MenuItem key={source.uid} value={source.uid}>
                {source.source.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {activeSource && (
        <>
          {activeSource.kind === SourceRowKind.Video && (
            <VideoSourceDisplay key={activeSource.uid} source={activeSource.source} />
          )}
          {activeSource.kind === SourceRowKind.Camera && (
            <CameraSourceDisplay key={activeSource.uid} source={activeSource.source} />
          )}
        </>
      )}
    </Box>
  );
};

interface VideoSourceDisplayProps {
  source: GunsAPI.VideoSource;
}

const VideoSourceDisplay: React.FC<VideoSourceDisplayProps> = (props) => {
  const { source } = props;

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const inferences = useInfiniteQuery(
    ['inferences/video', source.id],
    async ({ pageParam = 0 }) => {
      const inferences = await taxiosGuns.$get('/v1/video-sources/{source_id}/inferences', {
        params: { source_id: source.id },
        query: { since_t: pageParam },
      });
      inferences.sort((a, b) => a.t - b.t);
      return inferences;
    },
    {
      getNextPageParam: (lastPage) => {
        return max(lastPage.map((it) => it.t));
      },
    },
  );

  // @NOTE: Native refetchInterval when used with useInfiniteQuery
  //        just refetches all pages instead of fetching the next one,
  //        so we have to do it manually
  React.useEffect(() => {
    const pages = inferences.data;
    if (!pages) return;
    const tid = setTimeout(() => {
      inferences.fetchNextPage();
    }, 500);
    return () => {
      clearTimeout(tid);
    };
  }, [inferences.data, inferences.fetchNextPage]);

  return (
    <Box sx={{ my: 1, display: 'flex', flexGrow: 1 }}>
      <Paper
        sx={{ ml: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'black' }}
      >
        <Box sx={{ flexGrow: 1, flexShrink: 0, position: 'relative' }}>
          <video ref={videoRef} controls muted autoPlay width="100%" height="100%" src={makeS3Href(source)} />
          {inferences.data && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, pointerEvents: 'none' }}>
              <Overlay videoRef={videoRef} inferences={inferences.data.pages.flat()} tKnownStart={source.t_start} />
            </Box>
          )}
        </Box>
        <Box sx={{ flexGrow: 0, flexShrink: 0, height: 10, mb: 1 }}>
          {inferences.data && (
            <Timeline videoRef={videoRef} inferences={inferences.data.pages.flat()} tKnownStart={source.t_start} />
          )}
        </Box>
      </Paper>
      <Paper sx={{ mr: 1, ml: 1, p: 1, width: 400, flexGrow: 0, flexShrink: 0 }}>
        {/*@WIP: Таймлайн с найденными изображениями*/}
      </Paper>
    </Box>
  );
};

interface CameraSourceDisplayProps {
  source: GunsAPI.CameraSource;
}

const CameraSourceDisplay: React.FC<CameraSourceDisplayProps> = (props) => {
  const { source } = props;

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useLayoutEffect(() => {
    const video = videoRef.current;
    const src = makeHlsHref(source);
    if (!video) return;

    let hls: Hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [source]);

  const inferences = useInfiniteQuery(
    ['inferences/camera', source.id],
    async ({ pageParam = 0 }) => {
      const inferences = await taxiosGuns.$get('/v1/camera-sources/{source_id}/inferences', {
        params: { source_id: source.id },
        query: { since_t: pageParam },
      });
      inferences.sort((a, b) => a.t - b.t);
      return inferences;
    },
    {
      getNextPageParam: (lastPage) => {
        return max(lastPage.map((it) => it.t));
      },
    },
  );

  // @NOTE: Native refetchInterval when used with useInfiniteQuery
  //        just refetches all pages instead of fetching the next one,
  //        so we have to do it manually
  React.useEffect(() => {
    const pages = inferences.data;
    if (!pages) return;
    const tid = setTimeout(() => {
      inferences.fetchNextPage();
    }, 500);
    return () => {
      clearTimeout(tid);
    };
  }, [inferences.data, inferences.fetchNextPage]);

  return (
    <Box sx={{ my: 1, display: 'flex', flexGrow: 1 }}>
      <Paper
        sx={{ ml: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'black' }}
      >
        <Box sx={{ flexGrow: 1, flexShrink: 0, position: 'relative' }}>
          <video ref={videoRef} controls muted autoPlay width="100%" height="100%" src={makeHlsHref(source)} />
          {inferences.data && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, pointerEvents: 'none' }}>
              <Overlay videoRef={videoRef} inferences={inferences.data.pages.flat()} />
            </Box>
          )}
        </Box>
        <Box sx={{ flexGrow: 0, flexShrink: 0, height: 10, mb: 1 }}>
          {inferences.data && <Timeline videoRef={videoRef} inferences={inferences.data.pages.flat()} />}
        </Box>
      </Paper>
      <Paper sx={{ mr: 1, ml: 1, p: 1, width: 400, flexGrow: 0, flexShrink: 0 }}>
        {/*@WIP: Таймлайн с найденными изображениями*/}
      </Paper>
    </Box>
  );
};

interface TimelineProps {
  inferences: GunsAPI.Inference[]; // @DOC: Have to be sorted
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  tKnownStart?: number;
}

const Timeline: React.FC<TimelineProps> = (props) => {
  const { inferences, videoRef, tKnownStart } = props;
  const ref = React.useRef<HTMLCanvasElement | null>(null);

  const [minConfidence] = useAtom(minConfidenceAtom);

  // const [rect, setRect] = React.useState(Rect)
  React.useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.error('Could not get video ref to draw overlay');
      return;
    }
    const canvas = ref.current;
    if (!canvas) {
      console.error('Could not get canvas ref to draw timeline');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get context to draw timeline');
      return;
    }

    let stop = false;
    function drawAndSchedule() {
      if (stop) return;
      if (!video) return;
      if (!canvas) return;
      if (!ctx) return;

      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;

      const margin = 22;

      const now = new Date().getTime() / 1000;
      const [tStart, tEnd] = tKnownStart ? [tKnownStart, tKnownStart + video.duration] : [now - video.duration, now];
      const t = tStart + video.currentTime;

      const availableWidth = width - 2 * margin;
      const dt = 1;
      const dx = availableWidth / (tEnd - tStart);

      ctx.clearRect(0, 0, width, height);
      let leftIdx = 0;
      for (let tLeft = tStart; tLeft < tEnd; tLeft += dt) {
        let rightIdx = leftIdx;
        let hasHits = false;
        while (rightIdx < inferences.length && inferences[rightIdx].t < tLeft + dt) {
          const hits = inferences[rightIdx].hits.filter((hit) => hit.c >= minConfidence);
          hasHits = hasHits || hits.length > 0;
          rightIdx++;
        }
        const x = (tLeft - tStart) * dx;
        const w = dt * dx;
        if (hasHits) {
          ctx.fillStyle = 'red';
          ctx.strokeStyle = 'none';
          ctx.fillRect(margin + x, 1, w, height - 2);
        } else if (rightIdx - leftIdx > 0) {
          // @NOTE: There are inferences but no hits
          ctx.fillStyle = '#333';
          ctx.strokeStyle = 'none';
          ctx.fillRect(margin + x, 1, w, height - 2);
        } else {
          // @NOTE: No inferences
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(margin + x, height / 2);
          ctx.lineTo(margin + x + w, height / 2);
          ctx.stroke();
          ctx.closePath();
        }
        leftIdx = rightIdx;
      }

      ctx.fillStyle = 'none';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      const dw = 15 * dt;
      ctx.strokeRect(margin + (t - tStart) * dx - dw / 2, 0, dw, height);

      requestAnimationFrame(drawAndSchedule);
    }
    drawAndSchedule();
    return () => {
      stop = true;
    };
  }, [inferences, tKnownStart, minConfidence]);

  return <canvas style={{ height: '100%', width: '100%', display: 'block' }} ref={ref} />;
};

interface OverlayProps {
  inferences: GunsAPI.Inference[]; // @DOC: Have to be sorted
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  tKnownStart?: number;
}
const Overlay: React.FC<OverlayProps> = (props) => {
  const { inferences, videoRef, tKnownStart } = props;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [minConfidence] = useAtom(minConfidenceAtom);

  React.useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.error('Could not get video ref to draw overlay');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Could not get canvas ref to draw overlay');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get context to draw overlay');
      return;
    }

    let stop = false;
    function drawAndSchedule() {
      if (stop) return;
      if (!video) return;
      if (!canvas) return;
      if (!ctx) return;

      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;

      const { videoWidth, videoHeight } = video;
      const scale = Math.min(width / videoWidth, height / videoHeight);
      const mx = (width - videoWidth * scale) / 2;
      const my = (height - videoHeight * scale) / 2;
      const dx = width - 2 * mx;
      const dy = height - 2 * my;

      const now = new Date().getTime() / 1000;
      const [tStart, _tEnd] = tKnownStart ? [tKnownStart, tKnownStart + video.duration] : [now - video.duration, now];
      const t = tStart + video.currentTime;

      const fade = 0.25;

      let leftIdx = 0;
      while (leftIdx < inferences.length && inferences[leftIdx].t < t - fade) {
        leftIdx++;
      }
      let rightIdx = leftIdx;
      while (rightIdx < inferences.length && inferences[rightIdx].t < t) {
        rightIdx++;
      }

      ctx.clearRect(0, 0, width, height);
      const slice = inferences.slice(leftIdx, rightIdx);
      const renderedHitIds = [];
      for (const inference of slice) {
        const t_a = 1 - (t - inference.t) / fade;
        for (const hit of inference.hits) {
          if (hit.c < minConfidence) continue;
          renderedHitIds.push(hit.id);
          // const c_a = Math.min(1, (hit.c - cMin) / (cMax - cMin));
          ctx.strokeStyle = `rgba(255, 0, 0, ${t_a})`;
          ctx.lineWidth = 2;
          // @NOTE: Database x and y are centers of rects
          ctx.strokeRect(mx + (hit.x - hit.w / 2) * dx, my + (hit.y - hit.h / 2) * dy, hit.w * dx, hit.h * dy);
        }
      }

      // @DEBUG
      // ctx.font = '20px sans';
      // ctx.fillStyle = 'red';
      // ctx.textBaseline = 'top';
      // ctx.fillText(renderedHitIds.join(', '), 0, 0);

      requestAnimationFrame(drawAndSchedule);
    }
    drawAndSchedule();
    return () => {
      stop = true;
    };
  }, [inferences, tKnownStart, minConfidence]);

  return <canvas style={{ height: '100%', width: '100%', display: 'block' }} ref={canvasRef} />;
};
