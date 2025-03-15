// app/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Pencil, ToggleLeft, ToggleRight, Search, Shield, TrafficCone } from "lucide-react";

type User = {
  id: string; // Changed to string for UUID
  username: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaginatedResponse = {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    position: "",
    role: "TRAFFIC_ENFORCER",
    active: true,
  });

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user.role !== "ADMIN")) {
      router.push("/violations");
      return;
    }

    fetchUsers();
  }, [status, page, searchUsername, router, session]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      if (!response.ok) {
        let errorData;
        const clonedResponse = response.clone();
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          const rawText = await clonedResponse.text();
          console.error("Raw response body:", rawText);
          errorData = { error: rawText || "No error message provided" };
        }
        console.error("Fetch users failed:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          headers: Object.fromEntries(response.headers.entries()),
        });
        throw new Error(errorData.error || `Failed to fetch users (Status: ${response.status})`);
      }
      const data: PaginatedResponse = await response.json();
      console.log("Fetch users response:", data);

      let filteredUsers = data.users;
      if (searchUsername) {
        filteredUsers = filteredUsers.filter((user) =>
          user.username.toLowerCase().includes(searchUsername.toLowerCase())
        );
      }

      setUsers(filteredUsers);
      setTotalPages(Math.ceil(data.total / limit));
      setTotalItems(data.total);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch users");
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user");
      }
      await response.json();
      setShowCreateDialog(false);
      setFormData({
        username: "",
        password: "",
        fullName: "",
        email: "",
        phone: "",
        position: "",
        role: "TRAFFIC_ENFORCER",
        active: true,
      });
      toast.success("User created successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/users?id=${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }
      await response.json();
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData({
        username: "",
        password: "",
        fullName: "",
        email: "",
        phone: "",
        position: "",
        role: "TRAFFIC_ENFORCER",
        active: true,
      });
      toast.success("User updated successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: currentActive ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${currentActive ? "deactivate" : "activate"} user`);
      }
      await response.json();
      setDeactivateUserId(null);
      toast.success(`User ${currentActive ? "deactivated" : "activated"} successfully!`);
      fetchUsers();
    } catch (error) {
      console.error(`Error ${currentActive ? "deactivating" : "activating"} user:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${currentActive ? "deactivate" : "activate"} user`);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "authenticated" && session?.user.role !== "ADMIN") {
    return <div>Access Denied: Only admins can view the users page.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <Card>
        <CardHeader>
          <CardTitle>List of Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4 space-x-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create User
            </Button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(user.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({
                            username: user.username,
                            password: "",
                            fullName: user.fullName,
                            email: user.email,
                            phone: user.phone,
                            position: user.position,
                            role: user.role,
                            active: user.active,
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeactivateUserId(user.id)}
                      >
                        {user.active ? (
                          <ToggleLeft className="h-4 w-4 text-red-500" />
                        ) : (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end mt-4">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                className="grid grid-cols-2 gap-4 mt-2"
              >
                <div>
                  <RadioGroupItem value="ADMIN" id="admin" className="peer sr-only" />
                  <Label
                    htmlFor="admin"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Shield className="mb-3 h-6 w-6" />
                    Admin
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="TRAFFIC_ENFORCER" id="traffic_enforcer" className="peer sr-only" />
                  <Label
                    htmlFor="traffic_enforcer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <TrafficCone className="mb-3 h-6 w-6" />
                    Traffic Enforcer
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Role</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  <div>
                    <RadioGroupItem value="ADMIN" id="admin-edit" className="peer sr-only" />
                    <Label
                      htmlFor="admin-edit"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Shield className="mb-3 h-6 w-6" />
                      Admin
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="TRAFFIC_ENFORCER" id="traffic_enforcer-edit" className="peer sr-only" />
                    <Label
                      htmlFor="traffic_enforcer-edit"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <TrafficCone className="mb-3 h-6 w-6" />
                      Traffic Enforcer
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Active Status</Label>
                <RadioGroup
                  value={formData.active ? "true" : "false"}
                  onValueChange={(value) => setFormData({ ...formData, active: value === "true" })}
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  <div>
                    <RadioGroupItem value="true" id="active-true" className="peer sr-only" />
                    <Label
                      htmlFor="active-true"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <ToggleRight className="mb-3 h-6 w-6 text-green-500" />
                      Active
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="false" id="active-false" className="peer sr-only" />
                    <Label
                      htmlFor="active-false"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <ToggleLeft className="mb-3 h-6 w-6 text-red-500" />
                      Inactive
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deactivateUserId !== null} onOpenChange={() => setDeactivateUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {deactivateUserId && users.find((u) => u.id === deactivateUserId)?.active
              ? "Are you sure you want to deactivate this user? They will no longer be able to log in."
              : "Are you sure you want to activate this user? They will be able to log in again."}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateUserId(null)}>
              Cancel
            </Button>
            <Button
              variant={deactivateUserId && users.find((u) => u.id === deactivateUserId)?.active ? "destructive" : "default"}
              onClick={() => {
                const user = users.find((u) => u.id === deactivateUserId);
                if (user) {
                  handleToggleActive(user.id, user.active);
                }
              }}
            >
              {deactivateUserId && users.find((u) => u.id === deactivateUserId)?.active ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}