import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ProjectWithRelations,
  type ProjectStatus,
  PROJECT_STATUS,
  hasAIConfiguration,
} from "@/types/project";
import { getInitials } from "@/types/profile";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectCardProps {
  project: ProjectWithRelations;
  className?: string;
}

const statusVariants: Record<ProjectStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  active: "bg-primary/10 text-primary border-primary/20",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusBarColors: Record<ProjectStatus, string> = {
  draft: "bg-muted-foreground/30",
  active: "bg-primary",
  on_hold: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-destructive/50",
};

export function ProjectCard({ project, className }: ProjectCardProps) {
  const hasAI = hasAIConfiguration(project.metadata);

  return (
    <Link href={`/projects/${project.id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200",
          "hover:border-primary/20 hover:shadow-md",
          "cursor-pointer",
          className
        )}
      >
        {/* Accent bar izquierda - estilo Midday */}
        <div
          className={cn(
            "absolute bottom-0 left-0 top-0 w-1 transition-all",
            statusBarColors[project.status]
          )}
        />

        <CardHeader className="pb-3 pl-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="truncate text-base font-semibold leading-tight transition-colors group-hover:text-primary">
                {project.name}
              </h3>
              {project.client && (
                <p className="truncate text-sm text-muted-foreground">
                  {project.client.company ?? project.client.name}
                </p>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {hasAI && (
                <Badge
                  variant="outline"
                  className="gap-1 border-accent-foreground/20 bg-accent/50 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", statusVariants[project.status])}
              >
                {PROJECT_STATUS[project.status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pl-5 pt-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {/* Deadline */}
            {project.deadline ? (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>
                  {formatDistanceToNow(new Date(project.deadline), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* Members avatars */}
            {project.members && project.members.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <div className="-space-x-2 flex">
                  {project.members.slice(0, 3).map((member) => (
                    <Avatar
                      key={member.id}
                      className="h-6 w-6 border-2 border-background"
                    >
                      <AvatarImage src={member.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {project.members.length > 3 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
