import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import axios from 'axios';
import styles from './GuildRuneStats.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function GuildRuneStats({ guildId }) {
  const [runeStats, setRuneStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState('swift');
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'

  const setOptions = [
    { value: 'swift', label: 'Swift', color: '#3b82f6' },
    { value: 'swiftWill', label: 'Swift + Will', color: '#8b5cf6' },
    { value: 'violent', label: 'Violent', color: '#ef4444' },
    { value: 'violentWill', label: 'Violent + Will', color: '#f97316' },
    { value: 'despair', label: 'Despair', color: '#22c55e' },
    { value: 'despairWill', label: 'Despair + Will', color: '#14b8a6' },
  ];

  // Colors for member lines in line chart
  const memberColors = [
    '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#14b8a6',
    '#ec4899', '#f59e0b', '#06b6d4', '#84cc16', '#6366f1', '#f43f5e',
    '#10b981', '#0ea5e9', '#a855f7', '#eab308', '#64748b', '#fb7185',
  ];

  useEffect(() => {
    fetchRuneStats();
  }, [guildId]);

  const fetchRuneStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/guilds/${guildId}/rune-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRuneStats(response.data.runeStats);
    } catch (error) {
      console.error('Error fetching rune stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSetOption = () => setOptions.find(s => s.value === selectedSet);

  // Calculate average speed for current set
  const calculateAverage = (stats) => {
    const validValues = stats
      .map(m => m.bestRuneSets?.[selectedSet])
      .filter(v => v && v > 0);
    if (validValues.length === 0) return 0;
    return Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
  };

  // Sort by selected set
  const sortedStats = [...runeStats].sort((a, b) =>
    (b.bestRuneSets?.[selectedSet] || 0) - (a.bestRuneSets?.[selectedSet] || 0)
  );

  const average = calculateAverage(sortedStats);

  // Calculate average for each set type (for line chart)
  const calculateSetAverage = (setType) => {
    const validValues = runeStats
      .map(m => m.bestRuneSets?.[setType])
      .filter(v => v && v > 0);
    if (validValues.length === 0) return 0;
    return Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
  };

  // Bar chart data (single set, all members)
  const barChartData = {
    labels: sortedStats.map(m => m.name),
    datasets: [
      {
        label: `${getCurrentSetOption()?.label || 'Swift'} (SPD)`,
        data: sortedStats.map(m => m.bestRuneSets?.[selectedSet] > 0 ? m.bestRuneSets[selectedSet] : 0),
        backgroundColor: getCurrentSetOption()?.color || '#3b82f6',
        borderColor: getCurrentSetOption()?.color || '#3b82f6',
        borderWidth: 2,
        borderRadius: 4,
      },
      // Average line
      {
        label: `Moyenne Guilde (${average} SPD)`,
        data: sortedStats.map(() => average),
        borderColor: '#fbbf24',
        borderWidth: 3,
        borderDash: [10, 5],
        pointRadius: 0,
        type: 'line',
        fill: false,
      },
    ],
  };

  // Line chart data (all sets, one line per member)
  const lineChartData = {
    labels: setOptions.map(s => s.label),
    datasets: [
      // One line per member
      ...runeStats.map((member, index) => ({
        label: member.name,
        data: setOptions.map(s => {
          const value = member.bestRuneSets?.[s.value];
          return value && value > 0 ? value : null;
        }),
        borderColor: memberColors[index % memberColors.length],
        backgroundColor: memberColors[index % memberColors.length] + '33',
        borderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: memberColors[index % memberColors.length],
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: false,
      })),
      // Average line
      {
        label: 'Moyenne Guilde',
        data: setOptions.map(s => calculateSetAverage(s.value)),
        borderColor: '#fbbf24',
        backgroundColor: 'transparent',
        borderWidth: 3,
        borderDash: [10, 5],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
    ],
  };

  // Bar chart options
  const barChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#ffffff',
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: `Set le plus rapide - ${getCurrentSetOption()?.label || 'Swift'}`,
        color: '#ffffff',
        font: { size: 18, weight: 'bold' },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        callbacks: {
          label: (context) => {
            if (context.dataset.label?.includes('Moyenne')) {
              return `Moyenne: +${context.raw} SPD`;
            }
            return `+${context.raw} SPD`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: '#ffffff',
          font: { size: 12 },
          callback: (value) => `+${value}`,
        },
      },
      y: {
        grid: { color: 'transparent' },
        ticks: { color: '#ffffff', font: { size: 12 } },
      },
    },
  };

  // Line chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#ffffff',
          font: { size: 11 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      title: {
        display: true,
        text: 'Comparaison des sets par membre sur base 100',
        color: '#ffffff',
        font: { size: 18, weight: 'bold' },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        callbacks: {
          label: (context) => {
            if (context.raw === null) return null;
            const label = context.dataset.label || '';
            if (label.includes('Moyenne')) {
              return `${label}: +${context.raw} SPD`;
            }
            return `${label}: +${context.raw} SPD`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: '#ffffff',
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: '#ffffff',
          font: { size: 12 },
          callback: (value) => `+${value}`,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <span>Chargement des statistiques...</span>
      </div>
    );
  }

  if (runeStats.length === 0) {
    return (
      <div className={styles.noData}>
        <div className={styles.noDataIcon}>📊</div>
        <h3>Aucune donnée disponible</h3>
        <p>Les membres de la guilde n'ont pas encore importé leurs données Summoners War.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Statistiques de Runes de la Guilde</h2>
        <p className={styles.subtitle}>Comparaison des sets les plus rapides entre membres</p>
      </div>

      <div className={styles.controls}>
        {chartType === 'bar' && (
          <div className={styles.setSelector}>
            {setOptions.map(option => (
              <button
                key={option.value}
                className={`${styles.setButton} ${selectedSet === option.value ? styles.active : ''}`}
                onClick={() => setSelectedSet(option.value)}
                style={{ '--set-color': option.color }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {chartType === 'line' && (
          <div className={styles.lineChartInfo}>
            <span>Chaque ligne représente un membre - Tous les sets sont affichés</span>
          </div>
        )}

        <div className={styles.chartTypeToggle}>
          <button
            className={`${styles.chartTypeBtn} ${chartType === 'bar' ? styles.active : ''}`}
            onClick={() => setChartType('bar')}
            title="Graphique en barres (par set)"
          >
            📊
          </button>
          <button
            className={`${styles.chartTypeBtn} ${chartType === 'line' ? styles.active : ''}`}
            onClick={() => setChartType('line')}
            title="Graphique en courbe (par membre)"
          >
            📈
          </button>
        </div>
      </div>

      {chartType === 'bar' && (
        <div className={styles.averageInfo}>
          <span className={styles.averageLabel}>Moyenne Guilde ({getCurrentSetOption()?.label}):</span>
          <span className={styles.averageValue}>+{average} SPD</span>
        </div>
      )}

      <div className={styles.chartContainer} style={{ height: chartType === 'line' ? '500px' : '400px' }}>
        {chartType === 'bar' ? (
          <Bar data={barChartData} options={barChartOptions} />
        ) : (
          <Line data={lineChartData} options={lineChartOptions} />
        )}
      </div>

      {chartType === 'bar' ? (
        <div className={styles.ranking}>
          <h3>Classement {getCurrentSetOption()?.label}</h3>
          <div className={styles.rankingList}>
            {sortedStats.map((member, index) => {
              const speed = member.bestRuneSets?.[selectedSet] || 0;
              const isAboveAverage = speed > average;
              return (
                <div key={member.id} className={styles.rankingItem}>
                  <span className={styles.rank}>#{index + 1}</span>
                  <div className={styles.memberInfo}>
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={styles.memberName}>{member.name}</span>
                  </div>
                  <div className={styles.speedContainer}>
                    <span
                      className={styles.speed}
                      style={{ color: getCurrentSetOption()?.color }}
                    >
                      {speed > 0 ? `+${speed} SPD` : '-'}
                    </span>
                    {speed > 0 && (
                      <span className={`${styles.avgIndicator} ${isAboveAverage ? styles.above : styles.below}`}>
                        {isAboveAverage ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.ranking}>
          <h3>Meilleur par set</h3>
          <div className={styles.bestBySetGrid}>
            {setOptions.map(setOption => {
              const bestMember = [...runeStats]
                .filter(m => m.bestRuneSets?.[setOption.value] > 0)
                .sort((a, b) => (b.bestRuneSets?.[setOption.value] || 0) - (a.bestRuneSets?.[setOption.value] || 0))[0];

              return (
                <div key={setOption.value} className={styles.bestBySetItem} style={{ '--set-color': setOption.color }}>
                  <span className={styles.setLabel}>{setOption.label}</span>
                  {bestMember ? (
                    <div className={styles.bestMemberInfo}>
                      <span className={styles.bestMemberName}>{bestMember.name}</span>
                      <span className={styles.bestMemberSpeed}>+{bestMember.bestRuneSets[setOption.value]} SPD</span>
                    </div>
                  ) : (
                    <span className={styles.noData}>-</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuildRuneStats;
