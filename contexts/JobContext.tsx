import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { Job, JobStatus } from '../lib/types';
import * as storage from '../lib/storage/jobs';

interface JobContextType {
  jobs: Job[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
  addJob: (data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Job>;
  updateJob: (id: string, data: Partial<Job>) => Promise<Job | null>;
  deleteJob: (id: string) => Promise<boolean>;
  getJobById: (id: string) => Job | undefined;
  getJobsByCustomer: (customerId: string) => Job[];
  getJobsByDate: (date: string) => Job[];
  getJobsByStatus: (status: JobStatus) => Job[];
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storage.getJobs();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const addJob = useCallback(
    async (data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const job: Job = {
        ...data,
        id: Crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await storage.addJob(job);
      setJobs((prev) => [...prev, job]);
      return job;
    },
    []
  );

  const updateJob = useCallback(async (id: string, data: Partial<Job>) => {
    const updated = await storage.updateJob(id, data);
    if (updated) {
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    }
    return updated;
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    const success = await storage.deleteJob(id);
    if (success) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
    }
    return success;
  }, []);

  const getJobById = useCallback(
    (id: string) => jobs.find((j) => j.id === id),
    [jobs]
  );

  const getJobsByCustomer = useCallback(
    (customerId: string) => storage.filterJobsByCustomer(jobs, customerId),
    [jobs]
  );

  const getJobsByDate = useCallback(
    (date: string) => storage.filterJobsByDate(jobs, date),
    [jobs]
  );

  const getJobsByStatus = useCallback(
    (status: JobStatus) => storage.filterJobsByStatus(jobs, status),
    [jobs]
  );

  return (
    <JobContext.Provider
      value={{ jobs, loading, refreshJobs, addJob, updateJob, deleteJob, getJobById, getJobsByCustomer, getJobsByDate, getJobsByStatus }}
    >
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJobs must be used within JobProvider');
  return ctx;
}
