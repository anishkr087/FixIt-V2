import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { ProfileFormValues } from '../validators/profileSchema';

export const useProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const user = useAuthStore.getState().user;
      if (!user || !user.phone) {
        throw new Error('Active user session not found.');
      }

      const payload = {
        phone: user.phone,
        name: values.name,
        location: values.location,
        email: values.email || undefined,
      };

      console.log('[API Request] Updating profile via TanStack Query:', payload);
      
      // Axios request to modular customer profile route
      const response = await apiClient.post('/customer/profile', payload);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('[API Success] Profile saved successfully:', data);
      if (data.success && data.user) {
        // Sync with local persisted Auth store for auth state tracking
        useAuthStore.setState({ user: data.user });
        
        // Invalidate or update profile caches
        queryClient.setQueryData(['customerProfile', data.user.phone], data.user);
      }
    },
  });
};
