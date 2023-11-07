import React from 'react';
import { AppBar, Box, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

export const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Система видеодетекции вооруженных людей
          </Typography>
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
