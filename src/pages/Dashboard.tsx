import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, BarChart3, Calendar, Globe } from "lucide-react";
import { toast } from "sonner";
import StatsOverview from "@/components/dashboard/StatsOverview";
import BookingsTable from "@/components/dashboard/BookingsTable";
import CampaignCards from "@/components/dashboard/CampaignCards";

interface DashboardData {
  connection: {
    id: string;
    client_name: string;
    is_active: boolean;
    created_at: string;
  };
  stats: {
    latest: any;
    history: any[];
  };
  bookings: any[];
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const Dashboard = () => {
  const [accessToken, setAccessToken] = useState(() => 
    localStorage.getItem('dashboard_access_token') || ''
  );
  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [timezone, setTimezone] = useState(() => 
    localStorage.getItem('dashboard_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const fetchDashboardData = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-client-dashboard', {
        body: { access_token: token }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Invalid access token');
      }

      setData(result);
      localStorage.setItem('dashboard_access_token', token);
      setAccessToken(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
      localStorage.removeItem('dashboard_access_token');
      setAccessToken('');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      fetchDashboardData(inputToken.trim().toUpperCase());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_access_token');
    setAccessToken('');
    setInputToken('');
    setData(null);
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem('dashboard_timezone', tz);
  };

  useEffect(() => {
    if (accessToken) {
      fetchDashboardData(accessToken);
    }
  }, []);

  // Access Gate
  if (!accessToken || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md gradient-card shadow-card">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="h-14 w-14 rounded-2xl gradient-primary shadow-button flex items-center justify-center">
                <BarChart3 className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Client Dashboard</CardTitle>
            <CardDescription>Enter your access code to view your stats and bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="ABC-1234"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                  className="h-12 text-center text-xl font-mono tracking-widest uppercase"
                  maxLength={8}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Your access code was provided when your integration was set up
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 gradient-primary shadow-button"
                disabled={loading || inputToken.length < 7}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Access Dashboard'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{data.connection.client_name}</h1>
            <p className="text-muted-foreground">Campaign Performance Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <StatsOverview stats={data.stats} />
            <CampaignCards stats={data.stats} />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsTable 
              bookings={data.bookings} 
              accessToken={accessToken}
              timezone={timezone}
              onUpdate={() => fetchDashboardData(accessToken)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
