import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api_workbench, api_customers, api_products, api_orders, api_aftersales, api_projects, api_contracts, api_me } from '../api/client';
import type { Customer, Product, Order, FollowTask, Biz, Utility } from '../mock/data';

export const useWorkbenchStore = defineStore('workbench', () => {
  const amt = ref(0);
  const delta = ref(0);
  const amtWeek = ref(0);
  const gmvCents = ref('0');
  const orderCount = ref('0');
  const completion = ref(0);
  const biz = ref<Biz[]>([]);
  const todos = ref<FollowTask[]>([]);

  async function load() {
    try {
      const r = await api_workbench.load();
      amt.value = r.data.amt;
      delta.value = r.data.delta;
      amtWeek.value = r.data.amtWeek;
      gmvCents.value = r.data.gmvCents;
      orderCount.value = r.data.orderCount;
      completion.value = r.data.completion;
      biz.value = r.data.biz;
      todos.value = r.data.todos;
    } catch {
      // ponytail: tolerate partial failure (e.g. /follow/todos 401) so KPI card and biz grid still render
    }
  }

  return { amt, delta, amtWeek, gmvCents, orderCount, completion, biz, todos, load };
});

export const useInfoStore = defineStore('info', () => {
  const customers = ref<Customer[]>([]);
  const products = ref<Product[]>([]);
  const orders = ref<Order[]>([]);
  const aftersales = ref<any[]>([]);
  const projects = ref<any[]>([]);
  const contracts = ref<any[]>([]);

  async function load() {
    // ponytail: each list call is independent; fail-soft keeps the tabs that succeeded visible
    const safe = async (fn: () => Promise<any>) => { try { return await fn(); } catch { return { data: { items: [] } }; } };
    const [cu, pr, or, af, pj, ct] = await Promise.all([
      safe(() => api_customers.list()),
      safe(() => api_products.list()),
      safe(() => api_orders.list()),
      safe(() => api_aftersales.list()),
      safe(() => api_projects.list()),
      safe(() => api_contracts.list()),
    ]);
    customers.value = cu.data.items;
    products.value = pr.data.items;
    orders.value = or.data.items;
    aftersales.value = af.data.items;
    projects.value = pj.data.items;
    contracts.value = ct.data.items;
  }

  return { customers, products, orders, aftersales, projects, contracts, load };
});

export const useMeStore = defineStore('me', () => {
  const profile = ref<{ id: string; displayName: string; role: string; region: string; avatar: string } | null>(null);
  const utilities = ref<Utility[]>([]);
  const metrics = ref<{ gmvCents: string; orderCount: string; aftersaleCount: string; completion: number } | null>(null);

  async function load() {
    // ponytail: split profile + reports so a 401 on /me/utilities doesn't blank the KPI card
    const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };
    const [profileRes, report] = await Promise.all([
      safe(() => api_me.profile(), { data: { id: "", displayName: "", role: "", region: "", avatar: "U", util: [] } } as any),
      safe(() => api_me.reports('MONTH'), { data: { gmvCents: "0", orderCount: "0", aftersaleCount: "0", completion: 0 } } as any),
    ]);
    profile.value = {
      id: profileRes.data.id,
      displayName: profileRes.data.displayName,
      role: profileRes.data.role,
      region: profileRes.data.region,
      avatar: profileRes.data.avatar,
    };
    utilities.value = profileRes.data.util;
    metrics.value = report.data;
  }

  return { profile, utilities, metrics, load };
});
