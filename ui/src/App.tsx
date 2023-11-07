import React from 'react';
import { QueryClientProvider } from 'react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { FeedPage } from './pages/FeedPage';
import { SourcesPage } from './pages/SourcesPage';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Layout } from './Layout';
import { queryClient } from './api';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          path: '/',
          element: <Navigate to="/feed" />,
        },
        {
          path: '/feed',
          element: <FeedPage />,
        },
        {
          path: '/sources',
          element: <SourcesPage />,
        },
      ],
    },
  ],
  { basename: '/ui' },
);

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export const App: React.FC = () => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </LocalizationProvider>
  );
};
