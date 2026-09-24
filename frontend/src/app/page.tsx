import { HealthStatus } from '@/components/health-status';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-1 text-muted-foreground">
          This is the project foundation. Employee and salary management features are
          not implemented yet.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <HealthStatus />
      </div>

      <div>
        <Button disabled>Add employee (coming soon)</Button>
      </div>
    </div>
  );
}
