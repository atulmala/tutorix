import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { SignUp } from './components/sign-up/SignUp';

type View = 'home' | 'signup' | 'login';

export function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  const handleBackHome = () => {
    setCurrentView('home');
  };

  const handleSignUp = () => {
    setCurrentView('signup');
  };

  const handleLogin = () => {
    // TODO: Implement login functionality
    setCurrentView('login');
    console.log('Navigate to login');
  };

  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <SignUp onBackHome={handleBackHome} onLogin={handleLogin} />
        </main>
      </div>
    );
  }

  return <HomeScreen onLogin={handleLogin} onSignUp={handleSignUp} />;
}

export default App;
