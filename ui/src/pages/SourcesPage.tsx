import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import React from 'react';
import { makeHlsHref, makeS3Href, queryClient, taxiosGuns } from '../api';
import { GunsAPI } from '../generated/GunsAPI';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useFilePicker } from 'use-file-picker';
import { maybe } from '../lib/utils';
import axios from 'axios';
import { Err, None, Ok, Option, Result, Some } from 'ts-results';
import { SourceRow, SourceRowKind, useSources } from '../lib/SourceRow';
import { Link } from 'react-router-dom';
import MonitorIcon from '@mui/icons-material/Monitor';

export const SourcesPage: React.FC = () => {
  const sources = useSources();

  const destroyVideoSource = React.useCallback(async (source: GunsAPI.VideoSource) => {
    const ok = confirm('Вы уверены?');
    if (!ok) return;
    await taxiosGuns.$delete('/v1/video-sources/{source_id}', { params: { source_id: source.id } });
    await queryClient.invalidateQueries('sources');
  }, []);

  const destroyCameraSource = React.useCallback(async (source: GunsAPI.CameraSource) => {
    const ok = confirm('Вы уверены?');
    if (!ok) return;
    await taxiosGuns.$delete('/v1/camera-sources/{source_id}', { params: { source_id: source.id } });
    await queryClient.invalidateQueries('sources');
  }, []);

  const updateVideoSource = React.useCallback(
    async (source: GunsAPI.VideoSource, update: GunsAPI.VideoSourceUpdate) => {
      await taxiosGuns.$patch('/v1/video-sources/{source_id}', update, { params: { source_id: source.id } });
      await queryClient.invalidateQueries('sources');
    },
    [],
  );

  const updateCameraSource = React.useCallback(
    async (source: GunsAPI.CameraSource, update: GunsAPI.CameraSourceUpdate) => {
      await taxiosGuns.$patch('/v1/camera-sources/{source_id}', update, { params: { source_id: source.id } });
      await queryClient.invalidateQueries('sources');
    },
    [],
  );

  const [newFileDialog, setNewFileDialog] = React.useState(false);
  const [newCameraDialog, setNewCameraDialog] = React.useState(false);

  function renderRow(row: SourceRow): React.ReactNode {
    switch (row.kind) {
      case SourceRowKind.Video: {
        const source = row.source;
        return (
          <TableRow key={source.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell>Файл</TableCell>
            <TableCell component="th" scope="row">
              {source.name}
            </TableCell>
            <TableCell>{makeS3Href(source)}</TableCell>
            <TableCell>{source.file.name}</TableCell>
            <TableCell>
              <Switch
                checked={source.is_active}
                onChange={(ev) => updateVideoSource(source, { is_active: ev.currentTarget.checked })}
              />
            </TableCell>
            <TableCell>
              <IconButton title="Просмотр" component={Link} to={`/feed?source=${row.uid}`}>
                <MonitorIcon />
              </IconButton>
              <IconButton title="Удалить" onClick={() => destroyVideoSource(source)}>
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        );
      }
      case SourceRowKind.Camera: {
        const source = row.source;
        return (
          <TableRow key={source.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell>Камера</TableCell>
            <TableCell component="th" scope="row">
              {source.name}
            </TableCell>
            <TableCell>{makeHlsHref(source)}</TableCell>
            <TableCell>{source.url}</TableCell>
            <TableCell>
              <Switch
                checked={source.is_active}
                onChange={(ev) => updateCameraSource(source, { is_active: ev.currentTarget.checked })}
              />
            </TableCell>
            <TableCell>
              <IconButton title="Просмотр" component={Link} to={`/feed?source=${row.uid}`}>
                <MonitorIcon />
              </IconButton>
              <IconButton title="Удалить" onClick={() => destroyCameraSource(source)}>
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        );
      }
      default: {
        const n: never = row;
        throw new Error(`Assertion failed, unhandled SourceRowKind ${(n as SourceRow).kind}`);
      }
    }
  }

  return (
    <Box m={2}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Тип</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Название</TableCell>
              <TableCell>Адрес</TableCell>
              <TableCell>Источник</TableCell>
              <TableCell
                title="Неактивные источники не анализируются моделью"
                sx={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}
              >
                Активен
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{sources.data != null && sources.data.map(renderRow)}</TableBody>
        </Table>
      </TableContainer>
      <Box mt={1} display="flex" justifyContent="right">
        <Box mr={1}>
          <Button onClick={() => setNewFileDialog(true)}>Добавить файл</Button>
          <NewFileDialog open={newFileDialog} onClose={() => setNewFileDialog(false)} />
        </Box>
        <Box>
          <Button onClick={() => setNewCameraDialog(true)}>Добавить камеру</Button>
          <NewCameraDialog open={newCameraDialog} onClose={() => setNewCameraDialog(false)} />
        </Box>
      </Box>
    </Box>
  );
};

interface NewFileDialogProps {
  open: boolean;
  onClose: () => void;
}

const NewFileDialog: React.FC<NewFileDialogProps> = (props) => {
  const [name, setName] = React.useState('');

  const picker = useFilePicker({
    multiple: false,
    readFilesContent: false,
    accept: ['video/mp4'],
  });
  const pickedFile = React.useMemo(() => {
    const pickedFile = maybe(picker.plainFiles[0]);
    return pickedFile ?? null;
  }, [picker.plainFiles]);

  const [progress, setProgress] = React.useState<number | null>(null);
  const [result, setResult] = React.useState<Option<Result<GunsAPI.File, string>>>(None);
  React.useEffect(() => {
    const controller = new AbortController();
    async function run() {
      if (!pickedFile) return;
      setProgress(null);
      setResult(None);

      try {
        const { file, s3_presigned_fields } = await taxiosGuns.$post(
          '/v1/files',
          { name: pickedFile.name, content_type: pickedFile.type },
          { axios: { signal: controller.signal } },
        );

        const formData = new FormData();
        Object.entries(s3_presigned_fields).forEach(([k, v]) => {
          formData.append(k, v as string);
        });
        formData.append('file', pickedFile);
        await axios.post('/s3/' + file.s3_bucket, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress(ev: ProgressEvent) {
            const newProgress = (ev.loaded / ev.total) * 100;
            setProgress(newProgress);
          },
        });
        setProgress(100);
        setResult(Some(Ok(file)));
      } catch (err: unknown) {
        console.error(err);
        setProgress(0);
        setResult(Some(Err('Не удалось загрузить файл')));
      }
    }
    run();
    return () => {
      controller.abort();
      setProgress(null);
      setResult(None);
    };
  }, [pickedFile]);

  const canCreate = name.trim() !== '' && result.some && result.val.ok;
  const createSource = React.useCallback(async () => {
    if (name.trim() === '') return;
    const file = result.expect('Can not create if result is none').expect('Can not create if result is not ok');
    await taxiosGuns.$post('/v1/video-sources', { name: name.trim(), file_id: file.id, is_active: true });
    await queryClient.invalidateQueries('sources');
    props.onClose();

    // @NOTE: The dialog box takes some time to hide,
    //        thus to avoid the visual bug we wait a bit before resetting the form.
    await new Promise((resolve) => setTimeout(resolve, 100));
    picker.clear();
    setName('');
  }, [name, picker, props, result]);

  return (
    <Dialog maxWidth="sm" fullWidth open={props.open} onClose={props.onClose}>
      <DialogTitle>Новый файл</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {pickedFile ? (
            <List>
              <ListItem
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={picker.clear}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  <Box sx={{ position: 'relative' }}>
                    <CircularProgress
                      variant="determinate"
                      sx={{
                        color: (theme) => theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
                      }}
                      value={100}
                    />
                    <CircularProgress
                      sx={{ position: 'absolute', left: 0 }}
                      variant={progress == null ? 'indeterminate' : 'determinate'}
                      value={progress ?? 0}
                    />
                  </Box>
                </ListItemIcon>
                <ListItemText primary={pickedFile.name} />
              </ListItem>
            </List>
          ) : (
            <FormControl>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={picker.openFilePicker}
              >
                Выберите файл
              </Button>
            </FormControl>
          )}
          <FormControl sx={{ mt: 2 }}>
            <TextField
              label="Имя источника"
              variant="outlined"
              value={name}
              onChange={(ev) => setName(ev.currentTarget.value)}
            />
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Отмена</Button>
        <Button onClick={createSource} disabled={!canCreate}>
          Добавить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface NewCameraDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_RTSP_URL = 'rtsp://';
const NewCameraDialog: React.FC<NewCameraDialogProps> = (props) => {
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState(DEFAULT_RTSP_URL);

  const canCreate = name.trim() !== '' && url.trim() != '' && url != DEFAULT_RTSP_URL;
  const createSource = React.useCallback(async () => {
    await taxiosGuns.$post('/v1/camera-sources', { name, url, is_active: true });
    await queryClient.invalidateQueries('sources');
    props.onClose();

    // @NOTE: The dialog box takes some time to hide,
    //        thus to avoid the visual bug we wait a bit before resetting the form.
    await new Promise((resolve) => setTimeout(resolve, 100));
    setName('');
    setUrl(DEFAULT_RTSP_URL);
  }, [name, props.onClose, url]);

  return (
    <Dialog maxWidth="sm" fullWidth open={props.open} onClose={props.onClose}>
      <DialogTitle>Новая камера</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column">
          <FormControl sx={{ mt: 1, mb: 2 }}>
            <TextField
              label="Имя источника"
              variant="outlined"
              value={name}
              onChange={(ev) => setName(ev.currentTarget.value)}
            />
          </FormControl>
          <FormControl>
            <TextField
              label="Адрес RTSP"
              variant="outlined"
              value={url}
              onChange={(ev) => setUrl(ev.currentTarget.value)}
            />
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Отмена</Button>
        <Button onClick={createSource} disabled={!canCreate}>
          Добавить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
