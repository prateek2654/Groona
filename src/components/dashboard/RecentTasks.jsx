import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import TaskCard from "../shared/TaskCard";
import { toast } from "sonner";

export default function RecentTasks({ tasks, loading }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }) => {
      const updated = await base44.entities.Task.update(taskId, data);
      
      // Create activity
      if (currentUser) {
        try {
          await base44.entities.Activity.create({
            action: data.status === 'completed' ? 'completed' : 'updated',
            entity_type: 'task',
            entity_id: taskId,
            entity_name: updated.title,
            project_id: updated.project_id,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
          });
        } catch (error) {
          console.error('Activity creation failed:', error);
        }
      }
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.Task.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete task');
    },
  });

  if (loading) {
    return (
      <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60">
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No tasks yet</p>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={(data) => updateTaskMutation.mutate({ taskId: task.id, data })}
              onDelete={() => deleteTaskMutation.mutate(task.id)}
              showProject={true}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}