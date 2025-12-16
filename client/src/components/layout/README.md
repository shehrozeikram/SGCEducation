# Layout Components

Reusable layout components for consistent page structure across the application.

## TopBar Component

A reusable top navigation bar that automatically includes:
- Page title (clickable to go to dashboard)
- Institution switcher (for super admin)
- "Back to Home" button
- User menu with profile and logout options

### Basic Usage

```jsx
import TopBar from '../components/layout/TopBar';

const MyPage = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="My Page Title" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Your page content */}
      </Container>
    </Box>
  );
};
```

### With Custom Actions

```jsx
import TopBar from '../components/layout/TopBar';
import { Button } from '@mui/material';
import { Add } from '@mui/icons-material';

const MyPage = () => {
  const customActions = (
    <Button variant="contained" startIcon={<Add />}>
      Add New
    </Button>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar 
        title="My Page Title" 
        actions={customActions}
      />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Your page content */}
      </Container>
    </Box>
  );
};
```

### Props

- `title` (string, default: "SGC Education") - Title to display in the topbar
- `showInstitutionSwitcher` (boolean, default: true) - Show/hide institution switcher
- `actions` (ReactNode, default: null) - Custom action buttons to display in the topbar

## PageLayout Component

A wrapper component that includes TopBar and provides consistent page structure.

### Usage

```jsx
import PageLayout from '../components/layout/PageLayout';

const MyPage = () => {
  return (
    <PageLayout title="My Page Title">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Your page content */}
      </Container>
    </PageLayout>
  );
};
```

### Props

- `title` (string, default: "SGC Education") - Page title
- `showInstitutionSwitcher` (boolean, default: true) - Show/hide institution switcher
- `actions` (ReactNode, default: null) - Custom action buttons
- `children` (ReactNode) - Page content

