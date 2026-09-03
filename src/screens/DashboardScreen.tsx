import { format } from 'date-fns';
import { useSharedValue } from 'react-native-reanimated';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AddExpenseSheet } from '../components/app/AddExpenseSheet';
import { Bar } from '../components/app/Bar';
import { BrandMark } from '../components/app/BrandMark';
import { Mascot, TUG_MS } from '../components/app/Mascot';
import { Wobble } from '../components/app/Wobble';
import { ShatterText } from '../components/app/ShatterText';
import { CTAButton } from '../components/app/CTAButton';
import { DashedButton } from '../components/app/DashedButton';
import { Ring } from '../components/app/Ring';
import { Screen } from '../components/app/Screen';
import { StatCell } from '../components/app/StatCell';
import { Text } from '../components/app/Text';
import { runThemeTransition } from '../components/app/themeTransition';
import { useScreenTour, useTourRunning } from '../components/app/tour';
import { useCategoriesWithProgress, usePeriodSummary } from '../hooks/useAggregates';
import { useNetWorth } from '../hooks/useAccounts';
import { useBillsDueSoon } from '../hooks/useBills';
import { useGoalsWithProgress } from '../hooks/useGoals';
import { useCurrentPeriod } from '../hooks/usePeriods';
import { useActiveProfile } from '../hooks/useProfiles';
import { useSetThemeMode, useSettings } from '../hooks/useSettings';
import type { TabScreenProps } from '../navigation/types';
import { colors, useThemeRepaint } from '../theme';
import { formatAmount, formatPercent } from '../utils/currency';
import { formatPeriodLabel } from '../utils/cycle';

type Props = TabScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  useThemeRepaint();
  const { data: profile } = useActiveProfile();
  const { data: period, isLoading: periodLoading, bounds } = useCurrentPeriod(profile?.id, profile?.cycle_start_day ?? 1);
  const { data: summary } = usePeriodSummary(profile?.id, period?.id);
  const { data: categories } = useCategoriesWithProgress(period?.id);
  const { data: netWorth } = useNetWorth(profile?.id);
  const { data: billsDueSoon } = useBillsDueSoon(profile?.id, 3);
  const { data: goals } = useGoalsWithProgress(profile?.id);
  const symbol = profile?.currency_symbol ?? 'Rs';
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { data: settings } = useSettings();
  const setThemeMode = useSetThemeMode();

  const themeButtonRef = useRef<View>(null);
  // Driven by the brand mark when it is tapped: the heading beside it breaks
  // apart character by character and reassembles with the horns.
  const markNudge = useSharedValue(0);
  // Play mode: the mark leaves its spot and roams, sizing these up and picking
  // one to bother. Each is handed over as a ref rather than a position — the
  // mascot measures them where they actually are, so the ones scrolled off
  // screen simply stop being options.
  const [playing, setPlaying] = useState(false);
  const summaryNudge = useSharedValue(0);
  const tilesNudge = useSharedValue(0);
  const headingRef = useRef<View>(null);
  const summaryRef = useRef<View>(null);
  const tilesRef = useRef<View>(null);
  const ringRef = useRef<View>(null);
  const categoriesRef = useRef<View>(null);
  // The header's own logo slot. The mark is hidden here while it is out roaming or
  // presenting, and the overlay copy starts from this exact spot — so what the
  // user sees is the one logo leaving its place, not a second one appearing.
  const markSlotRef = useRef<View>(null);
  // Purely presentational mischief: the mascot tugs a chart out of shape and the
  // numbers beside it follow, but nothing is written — the next render off real
  // data is unchanged.
  const [mischief, setMischief] = useState(0);
  const [mischiefKind, setMischiefKind] = useState<'ring' | 'bars' | null>(null);
  const mischiefTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function playMischief(kind: 'ring' | 'bars') {
    if (mischiefTimer.current) return;
    setMischiefKind(kind);
    const started = Date.now();
    const total = TUG_MS;
    const step = () => {
      const t = (Date.now() - started) / total;
      if (t >= 1) {
        mischiefTimer.current = null;
        setMischief(0);
        setMischiefKind(null);
        return;
      }
      // Same tug of war the mascot is pulling: heave, give ground, heave harder,
      // then snap back when it lets go.
      const value =
        t < 0.18
          ? (t / 0.18) * 0.8
          : t < 0.32
            ? 0.8 - ((t - 0.18) / 0.14) * 0.48
            : t < 0.5
              ? 0.32 + ((t - 0.32) / 0.18) * 0.68
              : t < 0.6
                ? 1
                : 1 - (t - 0.6) / 0.4;
      setMischief(value);
      // Throttled well below frame rate: this re-renders the whole dashboard, and
      // the shapes read fine at this cadence.
      mischiefTimer.current = setTimeout(step, 45);
    };
    step();
  }

  useEffect(() => {
    return () => {
      if (mischiefTimer.current) clearTimeout(mischiefTimer.current);
    };
  }, []);


  const ringMischief = mischiefKind === 'ring' ? mischief : 0;
  const barMischief = mischiefKind === 'bars' ? mischief : 0;

  // `appeal` is the only steer given: the donut and the bars are the good gags,
  // so it gravitates to them, but distance and novelty still get a say and the
  // pick is never the same twice.
  const targets = useMemo(
    () => [
      { ref: headingRef, nudge: markNudge, pull: { dx: 14, dy: 6 }, appeal: 0.45 },
      { ref: summaryRef, nudge: summaryNudge, pull: { dx: 10, dy: -8 }, appeal: 0.5 },
      { ref: tilesRef, nudge: tilesNudge, pull: { dx: 12, dy: 8 }, appeal: 0.4 },
      // Hauls the donut down, and drags the category bars out to the right.
      { ref: ringRef, onArrive: () => playMischief('ring'), pull: { dx: -8, dy: 30 }, appeal: 0.9 },
      { ref: categoriesRef, onArrive: () => playMischief('bars'), pull: { dx: 38, dy: 0 }, appeal: 0.85 },
    ],
    // playMischief is stable enough for this — it only reads refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markNudge, summaryNudge, tilesNudge]
  );


  // Stands play mode down while a walkthrough is on: two marks on screen at once
  // reads as a bug rather than a feature.
  const tourRunning = useTourRunning();

  const tour = useScreenTour(
    'Dashboard',
    useMemo(
      () => [
        { ref: headingRef, text: 'This is the cycle you are in. Everything below it is this month only.' },
        { ref: ringRef, text: 'Budget left across every category. Watch it fall as the month goes.' },
        { ref: summaryRef, text: 'Safe to spend is what is actually yours today, once every allotment is taken out.' },
        { ref: tilesRef, text: 'Spent and put away so far this cycle.' },
        { ref: categoriesRef, text: 'One card per category. Tap any of them for its full story.' },
      ],
      []
    )
  );

  function toggleTheme() {
    if (!settings) return;
    const next = settings.theme_mode === 'light' ? 'dark' : 'light';
    // The write is deferred to the peak of the transition, so the theme flips
    // while the singularity covers the screen.
    runThemeTransition(themeButtonRef, next, () => setThemeMode(next));
  }

  if (periodLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!period) {
    return (
      <Screen>
        <Text variant="monoLabel" className="text-primary">
          {formatPeriodLabel(bounds.start.toISOString()).toUpperCase()}
        </Text>
        <Text variant="display" className="mt-1.5">
          New month
        </Text>
        <View className="mt-4 rounded-3xl border border-border bg-card p-5">
          <Text variant="label" className="leading-5">
            You haven&apos;t set up a budget for this cycle yet. Start it now — you can copy last
            month&apos;s categories or start fresh.
          </Text>
          <CTAButton
            label="START THIS MONTH'S BUDGET"
            className="mt-4"
            onPress={() => navigation.navigate('BudgetSetup', { mode: 'newMonth' })}
          />
        </View>
      </Screen>
    );
  }

  const ringFraction = summary && summary.totalAllocated > 0 ? summary.totalRemaining / summary.totalAllocated : 0;
  const over = (summary?.totalRemaining ?? 0) < -0.5;
  const ringColor = over ? colors.danger : colors.accent;

  return (
    <Screen
      tour={tour}
      tourOrigin={markSlotRef}
      overlay={
        <Mascot
          playing={playing && !tourRunning}
          targets={targets}
          origin={markSlotRef}
          // Ten comebacks in, the black hole gets it. It walks back to the header
          // and play mode ends with it — the mark is already in its slot by then,
          // so this just puts the header's own logo back on screen.
          onConcede={() => setPlaying(false)}
        />
      }
    >
      <Pressable
        onPress={() => navigation.navigate('BudgetProfiles')}
        className="flex-row items-center gap-1.5 self-start mb-3 rounded-full border border-border-strong px-2.5 py-1.5 active:border-primary"
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: profile?.color ?? colors.accent }} />
        <Text variant="mono" className="font-mono-bold text-[9px] tracking-wider text-primary" numberOfLines={1}>
          {profile?.name ?? 'PROFILE'}
        </Text>
      </Pressable>

      <View className="flex-row items-start justify-between gap-3 mb-5">
        <View className="flex-row items-center gap-2.5">
          <View
            ref={markSlotRef}
            collapsable={false}
            style={{ opacity: playing || tourRunning ? 0 : 1 }}
          >
            <BrandMark size={30} nudge={markNudge} />
          </View>
          <View ref={headingRef} collapsable={false}>
            <ShatterText
              text={formatPeriodLabel(period.cycle_start_date).toUpperCase()}
              progress={markNudge}
              variant="mono"
              className="text-[10px] tracking-[3px] text-primary"
              amplitude={5}
            />
            <View className="mt-0.5">
              <ShatterText
                text="Your budget"
                progress={markNudge}
                className="font-heading"
                style={{ fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 }}
                amplitude={8}
              />
            </View>
          </View>
        </View>
        <View className="flex-row items-center gap-2 mt-1.5">
          <Pressable
            onPress={() => setPlaying((on) => !on)}
            hitSlop={8}
            className="rounded-full border border-border-strong px-3 py-2 active:border-primary"
            style={playing ? { borderColor: colors.accent } : undefined}
          >
            <Text variant="mono" className="font-mono-bold text-[10px] tracking-wider text-primary">
              {playing ? '✦' : '✧'}
            </Text>
          </Pressable>
          <Pressable
            ref={themeButtonRef}
            onPress={toggleTheme}
            hitSlop={8}
            className="rounded-full border border-border-strong px-3 py-2 active:border-primary"
          >
            <Text variant="mono" className="font-mono-bold text-[10px] tracking-wider text-primary">
              {settings?.theme_mode === 'light' ? '☾' : '☀'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('BudgetSetup', { mode: 'edit', periodId: period.id })}
            className="rounded-full border border-border-strong px-3 py-2 active:border-primary"
          >
            <Text variant="mono" className="font-mono-bold text-[10px] tracking-wider text-primary">
              {profile?.budget_mode === 'percent' ? '% MODE' : 'RS MODE'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Wobble
        progress={summaryNudge}
        viewRef={summaryRef}
        className="rounded-3xl border border-border bg-card px-5 pt-[22px] pb-[18px]"
      >
        <View className="flex-row items-center gap-[18px]">
          <View ref={ringRef} collapsable={false}>
            <Ring
              fraction={ringFraction * (1 - 0.85 * ringMischief)}
              color={ringColor}
              label={`${Math.round(Math.max(0, Math.min(1, ringFraction * (1 - 0.85 * ringMischief))) * 100)}%`}
              sublabel="BUDGET LEFT"
            />
          </View>
          <View className="flex-1 min-w-0">
            <Text variant="mono" className="text-[9px] tracking-[3px] text-faint">
              SAFE TO SPEND
            </Text>
            <Text
              className="mt-1"
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 30,
                lineHeight: 38,
                letterSpacing: -0.4,
                color: over ? colors.danger : colors.textPrimary,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatAmount((summary?.totalRemaining ?? 0) * (1 - 0.85 * ringMischief), symbol)}
            </Text>
            <Text variant="mono" className="mt-2 text-[10px] leading-4">
              {(summary?.overCount ?? 0) > 0
                ? `${summary!.overCount} ${summary!.overCount === 1 ? 'category' : 'categories'} over budget`
                : 'every category inside its budget'}
            </Text>
          </View>
        </View>

        <View className="flex-row mt-5 pt-4 border-t border-border">
          <StatCell label="SALARY" value={formatAmount(period.salary_amount, symbol)} className="flex-1" />
          <StatCell
            label="ALLOTTED"
            value={formatAmount(summary?.totalAllocated ?? 0, symbol)}
            className="flex-1 pl-3 border-l border-border"
          />
          <StatCell
            label="UNALLOTTED"
            value={formatAmount(period.salary_amount - (summary?.totalAllocated ?? 0), symbol)}
            color={period.salary_amount - (summary?.totalAllocated ?? 0) < -0.5 ? colors.danger : colors.textPrimary}
            className="flex-1 pl-3 border-l border-border"
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Accounts')}
          className="flex-row items-center justify-between mt-4 pt-4 border-t border-border active:opacity-70"
        >
          <StatCell
            label="NET WORTH"
            value={formatAmount(netWorth?.netWorth ?? 0, symbol)}
            color={(netWorth?.netWorth ?? 0) < 0 ? colors.danger : colors.textPrimary}
          />
          <Text variant="mono" className="font-mono-bold text-[10px] text-primary">
            ACCOUNTS →
          </Text>
        </Pressable>
      </Wobble>

      <Wobble progress={tilesNudge} viewRef={tilesRef} className="flex-row gap-2.5 mt-3">
        <View className="flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            SPENT
          </Text>
          <Text style={{ fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 }} className="font-heading mt-1">
            {formatAmount(summary?.totalSpent ?? 0, symbol)}
          </Text>
        </View>
        <View className="flex-1 rounded-[18px] border border-border bg-card px-4 py-3.5">
          <Text variant="mono" className="text-[9px] tracking-widest text-faint">
            TO SAVINGS
          </Text>
          <Text style={{ fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2, color: colors.success }} className="font-heading mt-1">
            {formatAmount(summary?.toSavings ?? 0, symbol)}
          </Text>
        </View>
      </Wobble>

      {(billsDueSoon ?? []).length > 0 ? (
        <>
          <View className="flex-row items-baseline justify-between mt-6 mb-3 px-0.5">
            <Text variant="monoLabel">Bills due soon</Text>
            <Pressable onPress={() => navigation.navigate('Bills')}>
              <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
                VIEW ALL →
              </Text>
            </Pressable>
          </View>

          {(billsDueSoon ?? []).map((bill) => (
            <Pressable
              key={bill.id}
              onPress={() => navigation.navigate('Bills')}
              className="flex-row items-center justify-between rounded-[18px] border border-border bg-card px-4 py-3.5 mb-2.5 active:border-border-strong"
            >
              <View className="flex-1 min-w-0 mr-3">
                <Text variant="subheading" numberOfLines={1}>
                  {bill.name}
                </Text>
                <Text variant="mono" className="text-[10px] text-faint mt-1">
                  DUE {format(new Date(bill.nextDueDate), 'MMM d').toUpperCase()}
                </Text>
              </View>
              <Text variant="mono" className="font-mono-bold text-xs">
                {formatAmount(bill.amount, symbol)}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {(goals ?? []).length > 0 ? (
        <>
          <View className="flex-row items-baseline justify-between mt-6 mb-3 px-0.5">
            <Text variant="monoLabel">Goals</Text>
            <Pressable onPress={() => navigation.navigate('Goals')}>
              <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
                VIEW ALL →
              </Text>
            </Pressable>
          </View>

          <View className="rounded-[20px] border border-border bg-card px-4 pt-[15px] pb-3.5 mb-2.5">
            {(goals ?? []).map((goal, i) => {
              const fraction = goal.target_amount > 0 ? goal.contributed / goal.target_amount : 0;
              return (
                <View key={goal.id} style={{ marginTop: i === 0 ? 0 : 14 }}>
                  <View className="flex-row items-center justify-between">
                    <Text style={{ fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <Text variant="mono" className="text-[10px] text-faint">
                      {formatAmount(goal.contributed, symbol)} / {formatAmount(goal.target_amount, symbol)}
                    </Text>
                  </View>
                  <View className="mt-2">
                    <Bar fraction={fraction} color={goal.color} height={5} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <View className="flex-row items-baseline justify-between mt-6 mb-3 px-0.5">
        <Text variant="monoLabel">Categories</Text>
        <Pressable onPress={() => navigation.navigate('BudgetSetup', { mode: 'edit', periodId: period.id })}>
          <Text variant="mono" className="font-mono-bold text-[11px] text-primary">
            EDIT →
          </Text>
        </Pressable>
      </View>

      <View ref={categoriesRef} collapsable={false}>
        {(categories ?? []).map((cat) => {
          const left = cat.remaining;
          const catOver = left < -0.5;
          const share = period.salary_amount > 0 ? cat.allocated / period.salary_amount : 0;
          return (
            <Pressable
              key={cat.id}
              onPress={() => navigation.navigate('CategoryDetail', { categoryId: cat.id, periodId: period.id })}
              className="rounded-[20px] border border-border bg-card px-4 pt-[15px] pb-3.5 mb-2.5 active:border-border-strong"
            >
              <View className="flex-row items-center gap-2.5">
                <View className="h-[9px] w-[9px] rounded-[2px]" style={{ backgroundColor: cat.color }} />
                <Text variant="subheading" className="flex-1" numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text variant="mono" className="font-mono-bold text-[11px] text-faint">
                  {formatPercent(share)}
                </Text>
              </View>
              <View className="flex-row items-baseline gap-1.5 mt-2.5">
                <Text
                  style={{ fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2, color: catOver ? colors.danger : colors.textPrimary }}
                  className="font-heading"
                >
                  {formatAmount(Math.abs(left), symbol)}
                </Text>
                <Text variant="mono" className="text-[10px] text-faint">
                  {catOver ? 'over budget' : 'pending'}
                </Text>
              </View>
              <View className="mt-[11px]">
                <Bar
                  fraction={
                    (cat.allocated > 0 ? cat.spent / cat.allocated : 0) +
                    (1 - (cat.allocated > 0 ? cat.spent / cat.allocated : 0)) * barMischief
                  }
                  color={catOver ? colors.danger : cat.color}
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text variant="mono" className="text-[10px] text-faint">
                  {formatAmount(cat.spent + (cat.allocated - cat.spent) * barMischief, symbol)} spent
                </Text>
                <Text variant="mono" className="text-[10px] text-faint">
                  {formatAmount(cat.allocated, symbol)} budget
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <DashedButton
        label="+ LOG AN EXPENSE"
        className="mt-1"
        onPress={() => setShowAddExpense(true)}
      />

      <AddExpenseSheet
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        periodId={period.id}
        categories={categories ?? []}
        currencySymbol={symbol}
      />
    </Screen>
  );
}

