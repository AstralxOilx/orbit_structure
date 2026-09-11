import WorkspaceApp from "@/features/workspace/workspace";
import { AuthGuard } from "@/features/auth/auth-guard";

export default function Home() {
  return (
    <AuthGuard>
      <WorkspaceApp />
    </AuthGuard>
  );
}
