import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, Users, TrendingDown, ChevronRight } from "lucide-react";

export default function RiskAssessment({ project, tasks, compact = false }) {
  const assessRisks = () => {
    const risks = [];
    const now = new Date();

    // Calculate risk score (0-100, higher = more risk)
    let riskScore = 0;
    const riskFactors = [];

    // 1. Deadline Risk (0-30 points)
    if (project.deadline) {
      const deadline = new Date(project.deadline);
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      const progress = project.progress || 0;
      const expectedProgress = 100 - ((daysUntilDeadline / 90) * 100); // Assuming 90 day project
      const progressGap = Math.max(0, expectedProgress - progress);
      
      if (daysUntilDeadline < 0 && project.status !== 'completed') {
        riskScore += 30;
        riskFactors.push({ factor: 'Overdue deadline', impact: 30 });
        risks.push({
          level: 'critical',
          category: 'Deadline',
          title: 'Project Overdue',
          description: `Project is ${Math.abs(daysUntilDeadline)} days past deadline`,
          impact: 'Critical',
          mitigation: 'Immediate action required: reassess scope, add resources, or extend deadline',
        });
      } else if (daysUntilDeadline <= 7 && progress < 80) {
        const points = Math.min(25, (80 - progress) / 3);
        riskScore += points;
        riskFactors.push({ factor: 'Tight deadline', impact: points });
        risks.push({
          level: 'high',
          category: 'Deadline',
          title: 'Tight Timeline',
          description: `Only ${daysUntilDeadline} days remaining with ${100 - progress}% work left`,
          impact: 'High',
          mitigation: 'Prioritize critical tasks, consider overtime, or negotiate deadline extension',
        });
      } else if (progressGap > 20) {
        const points = Math.min(15, progressGap / 5);
        riskScore += points;
        riskFactors.push({ factor: 'Behind schedule', impact: points });
        risks.push({
          level: 'medium',
          category: 'Progress',
          title: 'Behind Schedule',
          description: `Project ${progressGap.toFixed(0)}% behind expected progress`,
          impact: 'Medium',
          mitigation: 'Review task priorities and remove blockers',
        });
      }
    }

    // 2. Task Health Risk (0-25 points)
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
    const totalTasks = tasks.length;
    
    if (totalTasks > 0) {
      const completionRate = ((totalTasks - pendingTasks) / totalTasks) * 100;
      
      if (completionRate < 25 && totalTasks > 10) {
        riskScore += 20;
        riskFactors.push({ factor: 'Low completion rate', impact: 20 });
        risks.push({
          level: 'high',
          category: 'Progress',
          title: 'Low Completion Rate',
          description: `Only ${completionRate.toFixed(0)}% of tasks completed (${totalTasks - pendingTasks}/${totalTasks})`,
          impact: 'High',
          mitigation: 'Break down complex tasks, reassign resources, identify and remove blockers',
        });
      } else if (completionRate < 50 && totalTasks > 5) {
        riskScore += 10;
        riskFactors.push({ factor: 'Moderate completion rate', impact: 10 });
      }
    }

    // 3. Overdue Tasks Risk (0-20 points)
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return new Date(t.due_date) < now;
    });

    if (overdueTasks.length > 0) {
      const points = Math.min(20, overdueTasks.length * 2);
      riskScore += points;
      riskFactors.push({ factor: 'Overdue tasks', impact: points });
      risks.push({
        level: overdueTasks.length > 5 ? 'critical' : 'high',
        category: 'Tasks',
        title: 'Overdue Tasks',
        description: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past due date`,
        impact: overdueTasks.length > 5 ? 'Critical' : 'High',
        mitigation: 'Review with task owners, reassign if needed, update deadlines if realistic',
      });
    }

    // 4. Workflow Bottleneck Risk (0-15 points)
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const reviewTasks = tasks.filter(t => t.status === 'review');
    
    if (inProgressTasks.length > totalTasks * 0.4) {
      riskScore += 10;
      riskFactors.push({ factor: 'Too many in-progress tasks', impact: 10 });
      risks.push({
        level: 'medium',
        category: 'Workflow',
        title: 'Work-in-Progress Overload',
        description: `${inProgressTasks.length} tasks in progress - possible multitasking issues`,
        impact: 'Medium',
        mitigation: 'Encourage team to finish tasks before starting new ones',
      });
    }

    if (reviewTasks.length > 5) {
      riskScore += 8;
      riskFactors.push({ factor: 'Review backlog', impact: 8 });
      risks.push({
        level: 'medium',
        category: 'Workflow',
        title: 'Review Backlog',
        description: `${reviewTasks.length} tasks waiting for review`,
        impact: 'Medium',
        mitigation: 'Assign dedicated reviewers, set review time limits',
      });
    }

    // 5. Resource Risk (0-10 points)
    const unassignedTasks = tasks.filter(t => !t.assigned_to && t.status !== 'completed');
    if (unassignedTasks.length > 0) {
      const points = Math.min(10, unassignedTasks.length);
      riskScore += points;
      riskFactors.push({ factor: 'Unassigned tasks', impact: points });
      risks.push({
        level: 'medium',
        category: 'Resources',
        title: 'Unassigned Tasks',
        description: `${unassignedTasks.length} task${unassignedTasks.length > 1 ? 's' : ''} need assignment`,
        impact: 'Medium',
        mitigation: 'Use auto-assignment feature or manually assign to available team members',
      });
    }

    return { risks, riskScore, riskFactors };
  };

  const { risks, riskScore, riskFactors } = assessRisks();
  const criticalRisks = risks.filter(r => r.level === 'critical').length;
  const highRisks = risks.filter(r => r.level === 'high').length;
  const mediumRisks = risks.filter(r => r.level === 'medium').length;

  const overallRiskLevel = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
  
  const riskColors = {
    critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
    low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  };

  const { bg, text, border, icon: Icon } = riskColors[overallRiskLevel];

  if (compact) {
    return (
      <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-xl ${bg} border ${border}`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`h-8 w-8 ${text}`} />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Overall Risk Level</p>
                <p className={`text-2xl font-bold ${text} capitalize`}>{overallRiskLevel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Risk Score</p>
                <p className={`text-3xl font-bold ${text}`}>{riskScore}</p>
              </div>
            </div>
            <Progress value={riskScore} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{criticalRisks}</p>
              <p className="text-xs text-slate-600">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{highRisks}</p>
              <p className="text-xs text-slate-600">High</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{mediumRisks}</p>
              <p className="text-xs text-slate-600">Medium</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Advanced Risk Assessment: {project.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`p-6 rounded-xl ${bg} border-2 ${border}`}>
          <div className="flex items-center gap-4 mb-4">
            <Icon className={`h-12 w-12 ${text}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">Overall Risk Assessment</p>
              <p className={`text-3xl font-bold ${text} capitalize mb-2`}>{overallRiskLevel} Risk</p>
              <Progress value={riskScore} className="h-3" />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Risk Score</p>
              <p className={`text-4xl font-bold ${text}`}>{riskScore}</p>
              <p className="text-xs text-slate-600">out of 100</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-sm text-slate-600 mb-1">Critical Risks</p>
              <p className="text-2xl font-bold text-red-600">{criticalRisks}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">High Risks</p>
              <p className="text-2xl font-bold text-orange-600">{highRisks}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Medium Risks</p>
              <p className="text-2xl font-bold text-amber-600">{mediumRisks}</p>
            </div>
          </div>
        </div>

        {/* Risk Factors Breakdown */}
        {riskFactors.length > 0 && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-3">Risk Factors Contribution</h4>
            <div className="space-y-2">
              {riskFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{factor.factor}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-red-500 h-2 rounded-full"
                        style={{ width: `${(factor.impact / 30) * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-900 w-8 text-right">+{factor.impact.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {risks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-semibold text-slate-900 mb-2">No Significant Risks Identified</p>
            <p className="text-slate-600">Project is on track with no major concerns</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Identified Risks & Mitigation Strategies</h3>
            {risks.map((risk, index) => {
              const riskStyle = riskColors[risk.level];
              return (
                <div key={index} className={`p-5 rounded-xl border-2 ${riskStyle.border} ${riskStyle.bg}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${riskStyle.bg} ${riskStyle.text} ${riskStyle.border} border`}>
                          {risk.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Impact: {risk.impact}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-lg mb-2">{risk.title}</h4>
                      <p className="text-sm text-slate-700 mb-3">{risk.description}</p>
                    </div>
                    <riskStyle.icon className={`h-7 w-7 ${riskStyle.text} flex-shrink-0`} />
                  </div>
                  
                  <div className={`p-3 rounded-lg bg-white/60 border ${riskStyle.border}`}>
                    <div className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-1">Recommended Action:</p>
                        <p className="text-sm text-slate-900">{risk.mitigation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}