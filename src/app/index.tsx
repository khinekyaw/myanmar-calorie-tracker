import { Redirect } from 'expo-router';

import { useOnboarding } from '@/store/onboarding';

export default function Index() {
  const completed = useOnboarding((s) => s.completed);
  return <Redirect href={completed ? '/home' : '/welcome'} />;
}
