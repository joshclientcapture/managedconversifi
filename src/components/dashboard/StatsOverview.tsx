import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Reply, Handshake, CalendarCheck, Send } from "lucide-react";

interface StatsOverviewProps {
  stats: {
    latest: any;
    history: any[];
  };
}

const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const latest = stats.latest || {};

  const statCards = [
    {
      title: "Connection Requests Sent",
      value: latest.pending_requests || 0,
      icon: Send,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Connections Made",
      value: latest.connections_made || 0,
      icon: Handshake,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      subValue: latest.acceptance_rate ? `${latest.acceptance_rate.toFixed(1)}% rate` : null
    },
    {
      title: "Messages Sent",
      value: latest.messages_sent || latest.total_sent || 0,
      icon: MessageSquare,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10"
    },
    {
      title: "Responses",
      value: latest.replies_received || latest.total_responses || 0,
      icon: Reply,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      subValue: latest.response_rate ? `${latest.response_rate.toFixed(1)}% rate` : null
    },
    {
      title: "Meetings Booked",
      value: latest.meetings_booked || 0,
      icon: CalendarCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    }
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const isLast = index === statCards.length - 1;
        const isOddTotal = statCards.length % 2 !== 0;
        
        return (
          <Card 
            key={stat.title} 
            className={`gradient-card shadow-card ${isLast && isOddTotal ? 'col-span-2 lg:col-span-1' : ''}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value.toLocaleString()}
              </div>
              {stat.subValue && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsOverview;
