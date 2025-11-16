import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Building2 } from 'lucide-react';
import type { Client } from '../../types';
import { clientsAPI } from '../../services/clients';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const data = await clientsAPI.getAll();
      setClients(data);
      setError('');
    } catch (err) {
      setError('Failed to load clients');
      console.error('Error loading clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      await clientsAPI.delete(id);
      await loadClients(); // Reload the list
    } catch (err) {
      setError('Failed to delete client');
      console.error('Error deleting client:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client accounts</p>
        </div>
        <Button variant="primary">
          <Plus size={20} className="mr-2" />
          Add Client
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  {client.company && (
                    <p className="text-sm text-gray-600">{client.company}</p>
                  )}
                  {client.email && (
                    <p className="text-sm text-blue-600">{client.email}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-1">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Edit3 size={16} className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleDelete(client.id)}
                  className="p-1 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Created: {new Date(client.createdAt).toLocaleDateString()}
            </div>
          </Card>
        ))}
      </div>

      {clients.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first client</p>
          <Button variant="primary">
            <Plus size={20} className="mr-2" />
            Add First Client
          </Button>
        </Card>
      )}
    </div>
  );
};