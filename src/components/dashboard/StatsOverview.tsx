import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Reply, Handshake, CalendarCheck, Send, UserCheck } from "lucide-react";

type TimePeriod = "last_7_days" | "last_14_days" | "last_30_days" | "all_time";

interface StatsOverviewProps {
  stats: {
    latest: any;
    history: any[];
    actualMeetingsBooked?: number;
  };
  selectedPeriod: TimePeriod;
}

const StatsOverview = ({ stats, selectedPeriod }: StatsOverviewProps) => {
  const latest = stats.latest || {};
  
  // Get campaign data and totals
  const campaignData = latest.campaign_data || {};
  const campaigns = campaignData.campaigns || [];
  const totals = campaignData.totals || {};
  
  // Get the totals for the selected period, fallback to all_time
  const periodTotals = totals[selectedPeriod] || totals.all_time || {};
  
  // Use period-specific totals for connection requests sent
  const totalSent = periodTotals.total_sent || latest.total_sent || 0;
  
  // Connections made and acceptance rate from period totals
  const connectionsMade = periodTotals.connections_accepted || latest.connections_made || 0;
  const acceptanceRate = periodTotals.acceptance_rate || latest.acceptance_rate || 0;
  
  // Sum inmails_sent + messages_sent from campaigns for the selected period
  let totalMessagesSent = 0;
  for (const campaign of campaigns) {
    const periodStats = campaign?.periods?.[selectedPeriod]?.stats || campaign?.stats || {};
    totalMessagesSent += (periodStats.inmails_sent || 0) + (periodStats.messages_sent || 0);
  }
  // Fallback to latest if no period data
  if (totalMessagesSent === 0) {
    totalMessagesSent = latest.messages_sent || 0;
  }
  
  // Total responses and response rate from period totals
  const totalResponses = periodTotals.total_responses || latest.total_responses || 0;
  const responseRate = periodTotals.response_rate || latest.response_rate || 0;
  
  // Count active campaigns
  const activeCampaigns = periodTotals.active_campaigns || campaigns.filter((c: any) => 
    c.status === 'active' || (c.status && c.status !== 'paused')
  ).length;

  // Meetings booked - use actual from DB (always all-time for now)
  const meetingsBooked = stats.actualMeetingsBooked ?? latest.meetings_booked ?? 0;

  const statCards = [
    {
      title: "Connection Requests Sent",
      value: totalSent,
      icon: Send,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Connections Made",
      value: connectionsMade,
      icon: Handshake,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      subValue: acceptanceRate ? `${Number(acceptanceRate).toFixed(1)}% rate` : null
    },
    {
      title: "Messages Sent",
      value: totalMessagesSent,
      icon: MessageSquare,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10"
    },
    {
      title: "Responses",
      value: totalResponses,
      icon: Reply,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      subValue: responseRate ? `${Number(responseRate).toFixed(1)}% rate` : null
    },
    {
      title: "Meetings Booked",
      value: meetingsBooked,
      icon: CalendarCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Active Accounts",
      value: activeCampaigns,
      icon: UserCheck,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    }
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title} className="glass-panel glass-panel-hover">
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
      ))}
    </div>
  );
};

export default StatsOverview;
