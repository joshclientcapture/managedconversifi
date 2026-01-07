import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, BarChart3, Calendar, Globe, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import StatsOverview from "@/components/dashboard/StatsOverview";
import BookingsTable from "@/components/dashboard/BookingsTable";
import CampaignCards from "@/components/dashboard/CampaignCards";
import ReportsSection from "@/components/dashboard/ReportsSection";
import Header from "@/components/Header";
import conversifiLogo from "@/assets/conversifi-logo.svg";
import conversifiLogoWhite from "@/assets/conversifi-logo-white.svg";

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

type TimePeriod = "last_7_days" | "last_14_days" | "last_30_days" | "all_time";

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_14_days', label: 'Last 14 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'all_time', label: 'All Time' },
];

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
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [timezone, setTimezone] = useState(() => 
    localStorage.getItem('dashboard_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all_time');
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchDashboardData = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-client-dashboard', {
        body: { access_token: token }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Invalid access code');
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

  const handlePinComplete = (value: string) => {
    if (value.length === 7) {
      fetchDashboardData(value.toUpperCase());
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

  const handleSyncStats = async () => {
    setSyncing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('sync-campaign-stats', {
        body: { access_token: accessToken }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Failed to sync stats');
      }

      toast.success('Stats synced successfully');
      // Refresh dashboard data after sync
      await fetchDashboardData(accessToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync stats');
    } finally {
      setSyncing(false);
    }
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
        <Card className="w-full max-w-md glass-panel shadow-card">
          <CardHeader className="text-center space-y-4">
            <img 
              src={isDark ? conversifiLogoWhite : conversifiLogo} 
              alt="Conversifi" 
              className="h-10 mx-auto transition-opacity duration-300"
            />
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold">Client Dashboard</CardTitle>
              <CardDescription>Enter your 7-digit access code</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <InputOTP 
              maxLength={7} 
              value={inputToken}
              onChange={(value) => {
                setInputToken(value.toUpperCase());
                handlePinComplete(value);
              }}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-10 text-lg font-mono uppercase" />
                <InputOTPSlot index={1} className="h-12 w-10 text-lg font-mono uppercase" />
                <InputOTPSlot index={2} className="h-12 w-10 text-lg font-mono uppercase" />
                <InputOTPSlot index={3} className="h-12 w-10 text-lg font-mono uppercase" />
                <InputOTPSlot index={4} className="h-12 w-10 text-lg font-mono uppercase" />
                <InputOTPSlot index={5} className="h-12 w-10 text-lg font-mono uppercase" />
                <InputOTPSlot index={6} className="h-12 w-10 text-lg font-mono uppercase" />
              </InputOTPGroup>
            </InputOTP>
            
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              Your access code was provided when your integration was set up
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header hideLogout />
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">{data.connection.client_name}</h1>
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
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncStats}
                disabled={syncing || loading}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncing ? 'Syncing...' : 'Sync Stats'}
              </Button>
            </div>
            <StatsOverview stats={data.stats} selectedPeriod={selectedPeriod} />
            <CampaignCards stats={data.stats} selectedPeriod={selectedPeriod} />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsTable 
              bookings={data.bookings} 
              accessToken={accessToken}
              timezone={timezone}
              onUpdate={() => fetchDashboardData(accessToken)}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsSection connectionId={data.connection.id} />
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
