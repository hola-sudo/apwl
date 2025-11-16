import React, { useState, useEffect } from 'react';
import { Users, Bot, Activity, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { sessionsAPI } from '../../services/sessions';
import { clientsAPI } from '../../services/clients';
import { agentsAPI } from '../../services/agents';

export const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalAgents: 0,
    totalSessions: 0,
    successRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // Load data from multiple endpoints
      const [clients, agents, sessions] = await Promise.all([
        clientsAPI.getAll(),
        agentsAPI.getAll(),
        sessionsAPI.getAll(),
      ]);

      // Calculate success rate
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const successRate = sessions.length > 0 
        ? Math.round((completedSessions.length / sessions.length) * 100) 
        : 0;

      setStats({
        totalClients: clients.length,
        totalAgents: agents.length,
        totalSessions: sessions.length,
        successRate,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statItems = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Agents',
      value: stats.totalAgents,
      icon: Bot,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{item.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${item.bgColor}`}>
                <Icon size={24} className={item.color} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};