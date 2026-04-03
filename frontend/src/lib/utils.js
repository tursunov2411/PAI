import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  BriefcaseBusiness,
  CircleDollarSign,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Sparkles,
  Bot,
  Brain,
} from "lucide-react";

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatDisplayDate = (value, options = {}) => {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
};

export const formatMonthLabel = (value) => {
  if (!value) {
    return "";
  }

  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatRelativeTime = (value) => {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = date.getTime() - Date.now();
  const divisions = [
    { amount: 1000 * 60 * 60 * 24 * 365, unit: "year" },
    { amount: 1000 * 60 * 60 * 24 * 30, unit: "month" },
    { amount: 1000 * 60 * 60 * 24 * 7, unit: "week" },
    { amount: 1000 * 60 * 60 * 24, unit: "day" },
    { amount: 1000 * 60 * 60, unit: "hour" },
    { amount: 1000 * 60, unit: "minute" },
  ];

  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  for (const division of divisions) {
    if (Math.abs(diffMs) >= division.amount || division.unit === "minute") {
      const valueForUnit = Math.round(diffMs / division.amount);
      return formatter.format(valueForUnit, division.unit);
    }
  }

  return "Just now";
};

export const estimateTokens = (text = "") => Math.ceil(text.trim().length / 4);

export const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const formatCost = (value = 0) => {
  if (!value) {
    return "$0.0000";
  }

  return `$${Number(value).toFixed(4)}`;
};

export const splitSuggestedNextAction = (content = "") => {
  const marker = "Suggested next action:";
  const index = content.lastIndexOf(marker);

  if (index === -1) {
    return {
      body: content,
      nextAction: "",
    };
  }

  return {
    body: content.slice(0, index).trim(),
    nextAction: content.slice(index + marker.length).trim(),
  };
};

export const modelMeta = {
  "gpt-4o": {
    label: "GPT-4o",
    shortLabel: "GPT",
    className: "border-chatgpt/30 bg-chatgpt/12 text-chatgpt",
    icon: Bot,
  },
  "claude-sonnet": {
    label: "Claude Sonnet",
    shortLabel: "Claude",
    className: "border-accent/30 bg-accent/12 text-accent",
    icon: Sparkles,
  },
  "gemini-pro": {
    label: "Gemini Pro",
    shortLabel: "Gemini",
    className: "border-gemini/30 bg-gemini/12 text-gemini",
    icon: Brain,
  },
};

export const getModelMeta = (model) => modelMeta[model] || modelMeta["claude-sonnet"];

export const goalCategoryMeta = {
  Academic: {
    icon: GraduationCap,
    className: "border-accent/30 bg-accent/12 text-accent",
  },
  Career: {
    icon: BriefcaseBusiness,
    className: "border-chatgpt/30 bg-chatgpt/12 text-chatgpt",
  },
  Personal: {
    icon: Sparkles,
    className: "border-warning/30 bg-warning/12 text-warning",
  },
  Financial: {
    icon: CircleDollarSign,
    className: "border-gemini/30 bg-gemini/12 text-gemini",
  },
  Health: {
    icon: HeartPulse,
    className: "border-error/30 bg-error/12 text-error",
  },
};

export const getGoalCategoryMeta = (category) =>
  goalCategoryMeta[category] || goalCategoryMeta.Personal;

export const noteSourceMeta = {
  manual: {
    label: "Manual",
    className: "border-manual/30 bg-manual/12 text-manual",
  },
  reddit: {
    label: "Reddit",
    className: "border-warning/30 bg-warning/12 text-warning",
  },
  twitter: {
    label: "Twitter",
    className: "border-gemini/30 bg-gemini/12 text-gemini",
  },
  youtube: {
    label: "YouTube",
    className: "border-error/30 bg-error/12 text-error",
  },
};

export const getNoteSourceMeta = (source) =>
  noteSourceMeta[source] || noteSourceMeta.manual;

export const isOverdue = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

export const isDueSoon = (value, days = 7) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const timeToMinutes = (value = "00:00") => {
  const [hours, minutes] = String(value)
    .split(":")
    .map((part) => Number(part));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
};

export const minutesToTime = (value) => {
  const safeValue = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeValue / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(safeValue % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const formatTimeLabel = (value = "00:00") => {
  const [rawHours, rawMinutes] = String(value).split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getWeekStart = (value = new Date()) => {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

export const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

export const formatWeekRange = (startDate) => {
  const start = getWeekStart(startDate);
  const end = addDays(start, 6);

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
};

export const getDurationLabel = (minutes = 0) => {
  if (!minutes) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours && remainder) {
    return `${hours}h ${remainder}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${remainder}m`;
};

export const sortGoalsBy = (goals = [], sortBy = "Deadline") => {
  const priorityRank = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const items = [...goals];

  switch (sortBy) {
    case "Priority":
      return items.sort(
        (left, right) =>
          (priorityRank[left.priority] ?? 10) - (priorityRank[right.priority] ?? 10),
      );
    case "Progress":
      return items.sort((left, right) => right.progress - left.progress);
    case "Created":
      return items.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
    case "Deadline":
    default:
      return items.sort((left, right) => {
        const leftTime = left.deadline
          ? new Date(left.deadline).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightTime = right.deadline
          ? new Date(right.deadline).getTime()
          : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
  }
};
