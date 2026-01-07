import { motion } from "framer-motion";
import { Skeleton, SkeletonCard, SkeletonList, SkeletonChart } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Header Skeleton */}
      <header className="border-b border-white/[0.08] backdrop-blur-xl sticky top-0 z-50 bg-black/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32 hidden sm:block" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Month Navigator Skeleton */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex items-center justify-center gap-4"
        >
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </motion.div>

        {/* Quick Actions Skeleton */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-2 justify-center"
        >
          {[...Array(7)].map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Skeleton className="h-10 w-32 rounded-xl" />
            </motion.div>
          ))}
        </motion.div>

        {/* Balance Cards Skeleton */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-3"
        >
          {[...Array(3)].map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <SkeletonCard />
            </motion.div>
          ))}
        </motion.div>

        {/* Month Overview Skeleton */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <div className="rounded-2xl p-6 glass">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02]">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Grid Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="lg:col-span-2 space-y-6"
          >
            <motion.div variants={itemVariants}>
              <SkeletonChart />
            </motion.div>
            <motion.div variants={itemVariants}>
              <SkeletonChart />
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl p-6 glass">
                <Skeleton className="h-6 w-48 mb-4" />
                <SkeletonList rows={5} />
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl p-6 glass">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <SkeletonList rows={3} />
              </div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl p-6 glass">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <SkeletonList rows={3} />
              </div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl p-6 glass">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <SkeletonList rows={2} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
