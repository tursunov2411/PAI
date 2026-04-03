import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PlaceholderPage({ title, description, week }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <Badge>{week}</Badge>
        <CardTitle className="text-3xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm text-text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

export default PlaceholderPage;
