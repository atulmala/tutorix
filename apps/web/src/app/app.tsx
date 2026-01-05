import { SignUp } from './components/sign-up/SignUp';

export function App() {
  return (
    <div className="min-h-screen bg-subtle text-primary">
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <SignUp />
      </main>
    </div>
  );
}

export default App;
