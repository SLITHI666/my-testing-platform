import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/userHome.vue';
import CreateTest from '../components/CreateTest.vue';
import MyTests from '../components/MyTests.vue';
import MyStatistics from '../components/MyStatistics.vue';
import Profile from '../components/userProfile.vue';
import TakeTest from '../components/TakeTest.vue';
import AuthPage from '../views/AuthPage.vue';
import UsersPage from '../components/Users.vue';
import ProfileUsers from '../components/ProfileUsers.vue';
import { supabase } from '../supabase';
import TestStatistics from '../components/TestStatistics.vue';
import TestUsers from '@/components/TestUsers.vue';
import UserAttempts from '@/components/UserAttempts.vue';
import EditTest from '../components/EditTest.vue';

const routes = [
  { path: '/auth', name: 'AuthPage', component: AuthPage },
  { path: '/home', name: 'userHome', component: Home, meta: { requiresAuth: true } },
  { path: '/create-test', name: 'CreateTest', component: CreateTest, meta: { requiresAuth: true } },
  { path: '/my-tests', name: 'MyTests', component: MyTests, meta: { requiresAuth: true } },
  { path: '/my-statistics', name: 'MyStatistics', component: MyStatistics, meta: { requiresAuth: true } },
  { path: '/profile', name: 'userProfile', component: Profile, meta: { requiresAuth: true } },
  { path: '/tests/:testId', name: 'TakeTest', component: TakeTest, meta: { requiresAuth: true } },
  { path: '/users', name: 'UsersPage', component: UsersPage, meta: { requiresAuth: true } }, 
  { path: '/users/:userId', name: 'ProfileUsers', component: ProfileUsers, meta: { requiresAuth: true } },
  { path: '/', redirect: '/auth' },
  { path: '/test-statistics/:testId', name: 'TestStatistics', component: TestStatistics, meta: { requiresAuth: true } },
  { path: '/test-users/:testId', name: 'TestUsers', component: TestUsers, props: true, },
  { path: '/user-attempts/:testId/:userId', name: 'UserAttempts', component: UserAttempts, props: true, },
  { path: '/EditTest/:testId', name: 'EditTest', component: EditTest, props: true, },
 
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const { data: { user } } = await supabase.auth.getUser();

  if (requiresAuth && !user) {
    next('/auth');
  } else if (to.path === '/auth' && user) {
    next('/home');
  } else {
    next();
  }
});

export default router;
