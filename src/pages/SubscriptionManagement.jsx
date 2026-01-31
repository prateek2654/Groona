import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users, Folder, HardDrive, FolderKanban, Sparkles, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SubscriptionPlanDialog from "../components/subscriptions/SubscriptionPlanDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SubscriptionManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => base44.entities.SubscriptionPlan.list('sort_order'),
    enabled: !!currentUser?.is_super_admin,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list(),
    enabled: !!currentUser?.is_super_admin,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SubscriptionPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setShowCreateDialog(false);
      toast.success('Subscription plan created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create plan', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubscriptionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setEditingPlan(null);
      toast.success('Subscription plan updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update plan', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setDeletingPlan(null);
      toast.success('Subscription plan deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete plan', { description: error.message });
    },
  });

  const getTenantsUsingPlan = (plan) => {
    // Match by subscription_plan_id (preferred) or fallback to name matching
    return tenants.filter(t => 
      t.subscription_plan_id === plan.id || 
      t.subscription_plan === plan.name.toLowerCase()
    ).length;
  };

  if (!currentUser?.is_super_admin) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Access denied. Super Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-600">Manage subscription plans for tenants</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60">
          <CardContent className="py-20 text-center">
            <p className="text-slate-600 mb-4">No subscription plans created yet.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-white/60 backdrop-blur-xl border-slate-200/60 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-1">{plan.description}</CardDescription>
                  </div>
                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    ${plan.monthly_price}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                <div className="text-sm text-slate-600">
                  ${plan.annual_price}/year (annual billing)
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Valid for {plan.validity_days || 30} days
                </div>

                {/* Features */}
                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span>{plan.features?.max_users || 1} Users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Folder className="h-4 w-4 text-purple-500" />
                    <span>{plan.features?.max_workspaces || 1} Workspaces</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <FolderKanban className="h-4 w-4 text-green-500" />
                    <span>{plan.features?.max_projects || 5} Projects</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <HardDrive className="h-4 w-4 text-orange-500" />
                    <span>{plan.features?.max_storage_gb || 1} GB Storage</span>
                  </div>
                  {plan.features?.ai_assistant_enabled && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>AI Assistant</span>
                    </div>
                  )}
                  {plan.features?.advanced_analytics_enabled && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <BarChart3 className="h-4 w-4 text-cyan-500" />
                      <span>Advanced Analytics</span>
                    </div>
                  )}
                </div>

                {/* Tenants using this plan */}
                <div className="text-xs text-slate-500 pt-2">
                  {getTenantsUsingPlan(plan)} tenant(s) using this plan
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingPlan(plan)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeletingPlan(plan)}
                    disabled={getTenantsUsingPlan(plan) > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <SubscriptionPlanDialog
        open={showCreateDialog || !!editingPlan}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        onSubmit={(data) => {
          if (editingPlan) {
            updateMutation.mutate({ id: editingPlan.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlan?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingPlan.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}