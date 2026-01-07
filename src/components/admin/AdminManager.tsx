import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

const AdminManager = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    
    // Fetch admin roles with user emails
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("id, user_id, created_at")
      .eq("role", "admin");

    if (error) {
      toast.error("Failed to fetch admins");
      console.error(error);
      setLoading(false);
      return;
    }

    // Get emails from auth.users via edge function
    const { data: usersData, error: usersError } = await supabase.functions.invoke("get-admin-users", {
      body: { user_ids: roles?.map(r => r.user_id) || [] },
    });

    if (usersError) {
      console.error("Failed to fetch user emails:", usersError);
    }

    const adminList: AdminUser[] = (roles || []).map(role => ({
      id: role.id,
      user_id: role.user_id,
      email: usersData?.users?.find((u: { id: string; email: string }) => u.id === role.user_id)?.email || "Unknown",
      created_at: role.created_at,
    }));

    setAdmins(adminList);
    setLoading(false);
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setAdding(true);

    // Find user by email via edge function
    const { data, error } = await supabase.functions.invoke("add-admin-user", {
      body: { email: newAdminEmail.trim() },
    });

    if (error || !data?.success) {
      toast.error(data?.error || "Failed to add admin");
      setAdding(false);
      return;
    }

    toast.success("Admin added successfully");
    setNewAdminEmail("");
    setAddDialogOpen(false);
    fetchAdmins();
    setAdding(false);
  };

  const removeAdmin = async (admin: AdminUser) => {
    if (admin.user_id === currentUserId) {
      toast.error("You cannot remove yourself as admin");
      return;
    }

    setRemovingId(admin.id);

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", admin.id);

    if (error) {
      toast.error("Failed to remove admin");
      console.error(error);
    } else {
      toast.success("Admin removed");
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
    }

    setRemovingId(null);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Admin Users</CardTitle>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No admins found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{admin.email}</span>
                      {admin.user_id === currentUserId && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={removingId === admin.id || admin.user_id === currentUserId}
                        >
                          {removingId === admin.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Admin?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove admin access for {admin.email}. They will no longer be able to access admin features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeAdmin(admin)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="user@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                disabled={adding}
              />
              <p className="text-xs text-muted-foreground">
                The user must already have an account in the system.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={addAdmin} disabled={adding}>
              {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminManager;
