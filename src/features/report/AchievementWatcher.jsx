import { useEffect, useRef } from 'react';
import { getUnlockedAchievements } from '../../lib/achievements';
import { useToast } from '../../shared/ui/Toast.jsx';
import { useUserData } from '../../providers/UserDataProvider.jsx';

/**
 * Watches pomodoroHistory for changes and fires toasts for newly unlocked achievements.
 * Must be rendered inside both UserDataProvider and ToastProvider.
 */
const AchievementWatcher = () => {
  const { pomodoroHistory, loading } = useUserData();
  const { toast } = useToast();
  const previousUnlockedRef = useRef(null);

  useEffect(() => {
    // Don't evaluate until initial data has loaded
    if (loading) return;

    const currentUnlocked = getUnlockedAchievements(pomodoroHistory);
    const currentIds = new Set(currentUnlocked.map((a) => a.id));

    // On first load, just store the baseline — don't toast old achievements
    if (previousUnlockedRef.current === null) {
      previousUnlockedRef.current = currentIds;
      return;
    }

    // Find achievements that are newly unlocked
    const previousIds = previousUnlockedRef.current;
    const newlyUnlocked = currentUnlocked.filter((a) => !previousIds.has(a.id));

    // Fire a toast for each new achievement
    newlyUnlocked.forEach((achievement) => {
      toast({
        message: `${achievement.title} — ${achievement.description}`,
        icon: achievement.icon,
        type: 'achievement',
        duration: 6000,
      });
    });

    previousUnlockedRef.current = currentIds;
  }, [pomodoroHistory, loading, toast]);

  return null;
};

export default AchievementWatcher;
