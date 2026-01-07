import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Send, MessageSquare, CheckCircle } from "lucide-react";

interface CampaignCardsProps {
  stats: {
    latest: any;
    history: any[];
  };
}

const CampaignCards = ({ stats }: CampaignCardsProps) => {
  const campaignData = stats.latest?.campaign_data;
  const campaigns = campaignData?.campaigns || [];

  if (campaigns.length === 0) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>No campaign data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Campaign statistics will appear here once data is synced from your outreach platform.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    // Only show "Paused" if explicitly paused, otherwise show "Active"
    if (status?.toLowerCase() === 'paused') {
      return <Badge variant="secondary">Paused</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Active Campaigns</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((campaign: any) => {
          const campaignStats = campaign.stats || {};
          const sentProgress = campaignStats.total_prospects > 0 
            ? (campaignStats.total_sent / campaignStats.total_prospects) * 100 
            : 0;

          return (
            <Card key={campaign.campaign_id} className="glass-panel glass-panel-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">{campaign.campaign_name}</CardTitle>
                    <CardDescription className="text-xs">{campaign.account_name}</CardDescription>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Outreach Progress</span>
                    <span>{campaignStats.total_sent || 0} / {campaignStats.total_prospects || 0}</span>
                  </div>
                  <Progress value={sentProgress} className="h-2" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{campaignStats.total_sent || 0}</p>
                      <p className="text-xs text-muted-foreground">Requests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{campaignStats.connections_accepted || 0}</p>
                      <p className="text-xs text-muted-foreground">Accepted</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{campaignStats.responses || 0}</p>
                      <p className="text-xs text-muted-foreground">Replies</p>
                    </div>
                  </div>
                </div>

                {/* Rates */}
                <div className="flex gap-4 pt-2 border-t border-border/50">
                  <div className="text-center flex-1">
                    <p className="text-lg font-semibold text-foreground">
                      {campaignStats.acceptance_rate?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Accept Rate</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-lg font-semibold text-foreground">
                      {campaignStats.response_rate?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Response Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignCards;
