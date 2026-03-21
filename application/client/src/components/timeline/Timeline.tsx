import { startTransition, useEffect, useEffectEvent, useState } from "react";

import { TimelineItem } from "@web-speed-hackathon-2026/client/src/components/timeline/TimelineItem";

const URGENT_COUNT = 3;
const DEFER_TIMEOUT_MS = 1200;

interface Props {
  timeline: Models.Post[];
  deferUntilIdle?: boolean;
  initialCount?: number;
  optimizeOffscreen?: boolean;
}

export const Timeline = ({
  timeline,
  deferUntilIdle = false,
  initialCount = URGENT_COUNT,
  optimizeOffscreen = false,
}: Props) => {
  const urgent = timeline.slice(0, initialCount);
  const rest = timeline.slice(initialCount);

  const [deferred, setDeferred] = useState<Models.Post[]>([]);

  const setDeferredEvent = useEffectEvent(() => {
    startTransition(() => {
      setDeferred(rest);
    });
  });
  useEffect(() => {
    if (!deferUntilIdle) {
      setDeferredEvent();
      return;
    }

    if (window.requestIdleCallback != null) {
      const id = window.requestIdleCallback(
        () => {
          setDeferredEvent();
        },
        { timeout: DEFER_TIMEOUT_MS },
      );

      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(() => {
      setDeferredEvent();
    }, 0);
    return () => window.clearTimeout(id);
  }, [deferUntilIdle, timeline]);

  return (
    <section>
      {urgent.map((post, index) => {
        return <TimelineItem key={post.id} post={post} priority={index === 0} />;
      })}
      {deferred.map((post) => {
        return <TimelineItem key={post.id} optimizeOffscreen={optimizeOffscreen} post={post} />;
      })}
    </section>
  );
};
