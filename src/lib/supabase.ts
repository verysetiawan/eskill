type AuthListener = (event: string, session: any) => void;
let listeners: AuthListener[] = [];
let currentSession: any = null;

// Initialize from localStorage
const storedSession = localStorage.getItem('esuk_session');
if (storedSession) {
  try {
    currentSession = JSON.parse(storedSession);
  } catch (e) {}
}

const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentSession && currentSession.access_token) {
    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
  }
  return headers;
};

async function executeSelect(table: string, filter: { column?: string; value?: any; single?: boolean }) {
  try {
    let url = `/api/db/${table}`;
    if (filter.column && filter.value) {
      url += `?${filter.column}=eq.${encodeURIComponent(filter.value)}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      return { data: null, error: { message: 'Unauthorized' } };
    }
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Request failed');
    
    if (filter.single) {
      const data = Array.isArray(result) ? result[0] : result;
      return { data, error: null };
    } else {
      return { data: result, error: null };
    }
  } catch (err: any) {
    return { data: null, error: err };
  }
}

async function executeUpsert(table: string, data: any) {
  try {
    const res = await fetch(`/api/db/${table}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (res.status === 401 || res.status === 403) {
      return { error: { message: 'Unauthorized' } };
    }
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Upsert failed');
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

async function executeDelete(table: string, filter: { column: string; value?: any; values?: any[] }) {
  try {
    const res = await fetch(`/api/db/${table}/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        column: filter.column,
        value: filter.value,
        values: filter.values
      })
    });
    if (res.status === 401 || res.status === 403) {
      return { error: { message: 'Unauthorized' } };
    }
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Delete failed');
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export const supabase = {
  auth: {
    async getSession() {
      if (currentSession && currentSession.access_token) {
        try {
          const res = await fetch('/api/auth/session', {
            headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            currentSession.user = data.user;
            localStorage.setItem('esuk_session', JSON.stringify(currentSession));
            return { data: { session: currentSession }, error: null };
          }
        } catch (e) {}
        currentSession = null;
        localStorage.removeItem('esuk_session');
      }
      return { data: { session: null }, error: null };
    },
    async signInWithPassword({ email, password }: any) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Login gagal');
        
        currentSession = {
          access_token: result.token,
          user: result.user
        };
        localStorage.setItem('esuk_session', JSON.stringify(currentSession));
        listeners.forEach(cb => cb('SIGNED_IN', currentSession));
        return { data: { session: currentSession }, error: null };
      } catch (err: any) {
        return { data: { session: null }, error: err };
      }
    },
    async signOut() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: currentSession ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {}
        });
      } catch (e) {}
      currentSession = null;
      localStorage.removeItem('esuk_session');
      listeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange(callback: AuthListener) {
      listeners.push(callback);
      callback('INITIAL_SESSION', currentSession);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners = listeners.filter(cb => cb !== callback);
            }
          }
        }
      };
    }
  },
  from(table: string) {
    return {
      select(columns?: string) {
        return {
          eq(column: string, value: any) {
            return {
              single() {
                return executeSelect(table, { column, value, single: true });
              },
              async then(resolve: any) {
                const res = await executeSelect(table, { column, value });
                resolve(res);
              }
            };
          },
          async then(resolve: any) {
            const res = await executeSelect(table, {});
            resolve(res);
          }
        };
      },
      upsert(data: any, options?: any) {
        return {
          async then(resolve: any) {
            const res = await executeUpsert(table, data);
            resolve(res);
          }
        };
      },
      delete() {
        return {
          eq(column: string, value: any) {
            return {
              async then(resolve: any) {
                const res = await executeDelete(table, { column, value });
                resolve(res);
              }
            };
          },
          in(column: string, values: any[]) {
            return {
              async then(resolve: any) {
                const res = await executeDelete(table, { column, values });
                resolve(res);
              }
            };
          }
        };
      }
    };
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('path', path);
            const headers: Record<string, string> = {};
            if (currentSession && currentSession.access_token) {
              headers['Authorization'] = `Bearer ${currentSession.access_token}`;
            }
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers,
              body: formData
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Upload failed');
            return { data: { path: result.imageUrl }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
        getPublicUrl(path: string) {
          const publicUrl = path.startsWith('/') ? path : `/uploads/${path}`;
          return { data: { publicUrl } };
        }
      };
    }
  },
  channel(name: string) {
    return {
      on(event: string, filter: any, callback: any) {
        return this;
      },
      subscribe() {
        return this;
      }
    };
  },
  removeChannel(channel: any) {
    // No-op
  }
};
