export function App() {
  return (
    <div className="min-h-screen bg-subtle text-primary">
      <header className="border-b border-subtle bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-lg">
          <div className="text-lg font-semibold tracking-tight">Tutorix</div>
          <div className="rounded-md bg-primary/10 px-md py-xs text-sm text-primary">
            Web client
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-2xl space-y-xl">
        <section className="rounded-xl bg-white p-2xl shadow-md">
          <div className="flex flex-col gap-lg md:flex-row md:items-center md:justify-between">
            <div className="space-y-sm">
              <p className="text-sm uppercase tracking-wide text-muted">Welcome</p>
              <h1 className="text-3xl font-semibold text-primary">
                Tutor & student portal
              </h1>
              <p className="text-base text-muted">
                A single place to connect tutors and students, manage sessions, and keep
                learning on track.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-lg md:grid-cols-2">
          <div className="rounded-xl border border-subtle bg-white p-xl shadow-sm">
            <p className="text-sm font-semibold text-primary">New user</p>
            <p className="mt-xs text-sm text-muted">
              Create your profile, set goals, and match with the right tutor or students.
            </p>
            <button className="mt-md w-full rounded-md bg-primary px-lg py-sm text-white shadow-sm transition hover:bg-primary/90">
              Get started
            </button>
          </div>
          <div className="rounded-xl border border-subtle bg-white p-xl shadow-sm">
            <p className="text-sm font-semibold text-primary">Already registered</p>
            <p className="mt-xs text-sm text-muted">
              Pick up where you left off—access sessions, materials, and messages.
            </p>
            <button className="mt-md w-full rounded-md border border-subtle bg-surface px-lg py-sm text-primary transition hover:border-primary">
              Go to login
            </button>
          </div>
        </section>

        <section className="grid gap-lg md:grid-cols-2">
          <div className="rounded-xl bg-white p-xl shadow-sm">
            <p className="text-sm font-semibold text-primary">For tutors</p>
            <ul className="mt-xs space-y-xs text-sm text-muted">
              <li>• Build a clear teaching profile and share availability.</li>
              <li>• Manage sessions, feedback, and resources in one place.</li>
              <li>• Communicate securely with students and guardians.</li>
            </ul>
          </div>
          <div className="rounded-xl bg-white p-xl shadow-sm">
            <p className="text-sm font-semibold text-primary">For students</p>
            <ul className="mt-xs space-y-xs text-sm text-muted">
              <li>• Find tutors aligned to your goals and schedule.</li>
              <li>• Track progress, assignments, and session history.</li>
              <li>• Stay organized with reminders and shared materials.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
