"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, Moon, Sun, Sunrise, Sunset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PrayerTime {
  name: string;
  time: string;
  icon: ElementType;
  arabicName: string;
}

const defaultPrayerTimes: PrayerTime[] = [
  { name: "Fajr", time: "05:15 AM", icon: Sunrise, arabicName: "الفجر" },
  { name: "Sunrise", time: "06:30 AM", icon: Sun, arabicName: "الشروق" },
  { name: "Dhuhr", time: "12:30 PM", icon: Sun, arabicName: "الظهر" },
  { name: "Asr", time: "03:45 PM", icon: Sun, arabicName: "العصر" },
  { name: "Maghrib", time: "06:30 PM", icon: Sunset, arabicName: "المغرب" },
  { name: "Isha", time: "08:00 PM", icon: Moon, arabicName: "العشاء" },
];

function getPrayerMinutes(value: string) {
  const [time, period] = value.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let totalMinutes = hours * 60 + minutes;

  if (period === "PM" && hours !== 12) {
    totalMinutes += 12 * 60;
  }

  if (period === "AM" && hours === 12) {
    totalMinutes = minutes;
  }

  return totalMinutes;
}

function getCurrentPrayer(prayers: PrayerTime[]) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let index = prayers.length - 1; index >= 0; index -= 1) {
    if (currentMinutes >= getPrayerMinutes(prayers[index].time)) {
      return prayers[index].name;
    }
  }

  return prayers[prayers.length - 1].name;
}

function getNextPrayer(prayers: PrayerTime[]) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const prayer of prayers) {
    if (prayer.name === "Sunrise") {
      continue;
    }

    if (currentMinutes < getPrayerMinutes(prayer.time)) {
      return { name: prayer.name, time: prayer.time };
    }
  }

  return { name: prayers[0].name, time: prayers[0].time };
}

export function PrayerTimesWidget() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState("");
  const [nextPrayer, setNextPrayer] = useState({ name: "", time: "" });

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    setCurrentPrayer(getCurrentPrayer(defaultPrayerTimes));
    setNextPrayer(getNextPrayer(defaultPrayerTimes));

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentTime) {
      return;
    }

    setCurrentPrayer(getCurrentPrayer(defaultPrayerTimes));
    setNextPrayer(getNextPrayer(defaultPrayerTimes));
  }, [currentTime]);

  const displayTime = mounted && currentTime
    ? currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const displayDate = mounted && currentTime
    ? currentTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "--";

  return (
    <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Clock className="h-5 w-5 text-primary" />
          Prayer Times
        </CardTitle>

        <div className="mt-2 rounded-lg bg-background/50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{displayTime}</p>
          <p className="mt-1 text-sm text-muted-foreground">{displayDate}</p>
        </div>

        {nextPrayer.name ? (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
            <p className="text-sm text-muted-foreground">Next Prayer</p>
            <p className="text-lg font-semibold text-primary">
              {nextPrayer.name} at {nextPrayer.time}
            </p>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-2">
        {defaultPrayerTimes.map((prayer) => {
          const Icon = prayer.icon;
          const isCurrent = prayer.name === currentPrayer;
          const isSunrise = prayer.name === "Sunrise";

          return (
            <div
              key={prayer.name}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
                isCurrent && !isSunrise && "border border-primary/20 bg-primary/10",
                isSunrise && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isCurrent && !isSunrise ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div>
                  <span
                    className={cn(
                      "font-medium",
                      isCurrent && !isSunrise ? "text-primary" : "text-foreground"
                    )}
                  >
                    {prayer.name}
                  </span>
                  <span className="ml-2 font-amiri text-xs text-muted-foreground">{prayer.arabicName}</span>
                </div>
              </div>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  isCurrent && !isSunrise ? "text-primary" : "text-muted-foreground"
                )}
              >
                {prayer.time}
              </span>
            </div>
          );
        })}

        <Link href="/prayer-times" className="mt-4 block">
          <Button variant="outline" className="w-full gap-2">
            View Full Schedule
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
