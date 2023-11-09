import React from 'react';
import { AppBar, Box, Divider, InputLabel, Slider, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { minConfidenceAtom } from './state';

export const Layout: React.FC = () => {
  const location = useLocation();
  const [minConfidence, setMinConfidence] = useAtom(minConfidenceAtom);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Система видеодетекции вооруженных людей
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InputLabel sx={{ flexShrink: 0, mr: 2 }}>Порог</InputLabel>
            <Slider
              sx={{ minWidth: 300 }}
              min={0}
              max={1}
              step={0.01}
              value={minConfidence}
              onChange={(_ev, newValue) => setMinConfidence(newValue as number)}
            />
            <Box sx={{ ml: 2 }}>{minConfidence.toFixed(2)}</Box>
          </Box>
          <Divider sx={{ mx: 3 }} orientation="vertical" flexItem />
          <Box sx={{ display: 'flex' }}>
            <Tabs aria-label="nav tabs" value={location.pathname !== '/' ? location.pathname : false}>
              <Tab label="Просмотр" component={NavLink} to="/feed" value="/feed" />
              <Tab label="Источники" component={NavLink} to="/sources" value="/sources" />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Outlet />
    </Box>
  );
};
