import { toast } from 'sonner';

export const notifications = {
  showError: (message: string) => {
    toast.error(message, {
      duration: 5000
    });
  },

  showSuccess: (message: string) => {
    toast.success(message, {
      duration: 3000
    });
  },

  showInfo: (message: string) => {
    toast.info(message, {
      duration: 3000
    });
  },

  pricesUpdated: () => {
    toast.success('Fuel prices have been updated', {
      description: 'Showing latest prices from all stations'
    });
  },

  locationUpdated: () => {
    toast.success('Location updated', {
      description: 'Recalculating distances to stations...'
    });
  },

  loadError: () => {
    toast.error('Failed to load petrol prices', {
      description: 'Please try refreshing the page'
    });
  },

  settingsSaved: () => {
    toast.success('Settings saved', {
      description: 'Your preferences will be remembered'
    });
  }
};
