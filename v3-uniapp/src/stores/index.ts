import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api_workbench, api_customers, api_products, api_orders, api_aftersales, api_me } from '../api/client';
import type { Customer, Product, Order, FollowTask, Biz, Utility } from '../mock/data';

export const useWorkbenchStore = defineStore('workbench', () => {
  const amt = ref(0);
  const delta = ref(0);
  const amtWeek = ref(0);
  const biz = ref<Biz[]>([]);
  const todos = ref<FollowTask[]>([]);

  async function load() {
    const r = await api_workbench.load();
    amt.value = r.data.amt;
    delta.value = r.data.delta;
    amtWeek.value = r.data.amtWeek;
    biz.value = r.data.biz;
    todos.value = r.data.todos;
  }

  return { amt, delta, amtWeek, biz, todos, load };
});

export const useInfoStore = defineStore('info', () => {
  const customers = ref<Customer[]>([]);
  const products = ref<Product[]>([]);
  const orders = ref<Order[]>([]);
  const aftersales = ref<any[]>([]);

  async function load() {
    const [cu, pr, or, af] = await Promise.all([
      api_customers.list(),
      api_products.list(),
      api_orders.list(),
      api_aftersales.list(),
    ]);
    customers.value = cu.data.items;
    products.value = pr.data.items;
    orders.value = or.data.items;
    aftersales.value = af.data.items;
  }

  return { customers, products, orders, aftersales, load };
});

export const useMeStore = defineStore('me', () => {
  const profile = ref<{ id: string; displayName: string; role: string; region: string; avatar: string } | null>(null);
  const utilities = ref<Utility[]>([]);

  async function load() {
    const r = await api_me.profile();
    profile.value = {
      id: r.data.id,
      displayName: r.data.displayName,
      role: r.data.role,
      region: r.data.region,
      avatar: r.data.avatar,
    };
    utilities.value = r.data.util;
  }

  return { profile, utilities, load };
});
