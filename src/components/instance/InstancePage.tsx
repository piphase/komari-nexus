import { NodeDetailsContent } from "./NodeDetailsContent";

interface InstancePageProps {
  uuid: string;
}

export default function InstancePage({ uuid }: InstancePageProps) {
  return <NodeDetailsContent uuid={uuid} />;
}
