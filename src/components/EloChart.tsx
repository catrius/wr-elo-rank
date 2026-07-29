import { useEffect, useState, useCallback, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import supabase from '@/lib/supabase.ts';
import type { Match, Season } from '@/types/common.ts';
import Select from '@/components/Select.tsx';

dayjs.extend(utc);

interface EloChartProps {
  playerId: number;
  matches: Match[];
}

export default function EloChart({ playerId, matches }: EloChartProps) {
  const [seasons, setSeasons] = useState<Pick<Season, 'id' | 'name' | 'start' | 'end'>[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | 'all'>('all');

  const fetchSeasons = useCallback(async () => {
    const { data } = await supabase
      .from('season')
      .select('id, name, start, end')
      .order('created_at', { ascending: false });
    if (data) {
      const typed = data as Pick<Season, 'id' | 'name' | 'start' | 'end'>[];
      setSeasons(typed);
      const current = typed.find((s) => !s.end);
      if (current) setSelectedSeasonId(current.id);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  const selectedSeason = useMemo(
    () => (selectedSeasonId === 'all' ? null : (seasons.find((s) => s.id === selectedSeasonId) ?? null)),
    [seasons, selectedSeasonId],
  );

  const eloHistory = useMemo(() => {
    let completed = matches
      .filter((m) => (m.result === 'A' || m.result === 'B') && m.team_a_new_elos && m.team_b_new_elos)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (selectedSeason) {
      completed = completed.filter(
        (m) =>
          (!selectedSeason.start || m.created_at >= selectedSeason.start) &&
          (!selectedSeason.end || m.created_at <= selectedSeason.end),
      );
    }

    return completed.map((m, i) => {
      const onTeamA = m.team_a_players.includes(playerId);
      const players = onTeamA ? m.team_a_players : m.team_b_players;
      const newElos = onTeamA ? m.team_a_new_elos! : m.team_b_new_elos!;
      const idx = players.indexOf(playerId);
      const date = dayjs.utc(m.created_at).local().format('DD/MM');
      return { elo: newElos[idx], date, tick: i };
    });
  }, [matches, playerId, selectedSeason]);

  const verticalDates = eloHistory.length > 50;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2
          className={`
            text-lg font-semibold
            md:text-xl
          `}
        >
          Elo History
        </h2>
        <Select
          value={String(selectedSeasonId)}
          options={[
            ...seasons.map((s) => ({ value: String(s.id), label: s.name ?? `Season ${s.id}` })),
            { value: 'all', label: 'All seasons' },
          ]}
          onChange={(v) => setSelectedSeasonId(v === 'all' ? 'all' : Number(v))}
        />
      </div>
      <div
        className={`
          mb-6 rounded-lg bg-white p-4 shadow
          dark:bg-gray-800
        `}
      >
        {eloHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={eloHistory}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                dataKey="tick"
                tick={{ fontSize: 11 }}
                interval={0}
                tickFormatter={(value) => {
                  if (value > 0 && eloHistory[value - 1]?.date === eloHistory[value]?.date) return '';
                  return eloHistory[value]?.date ?? '';
                }}
                angle={verticalDates ? -90 : 0}
                textAnchor={verticalDates ? 'end' : 'middle'}
                height={verticalDates ? 60 : 30}
              />
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 12 }} width={45} />
              <Tooltip
                contentStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
                formatter={(value) => [value, 'Elo']}
                labelFormatter={(_, payload) => (payload.length ? payload[0].payload.date : '')}
              />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p
            className={`
              py-8 text-center text-gray-500
              dark:text-gray-400
            `}
          >
            No match data available
          </p>
        )}
      </div>
    </>
  );
}
