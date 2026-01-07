import { motion } from "framer-motion";
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{
    className?: string;
  }>;
  actions?: React.ReactNode;
}
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions
}: PageHeaderProps) {
  return <motion.div initial={{
    opacity: 0,
    y: -10
  }} animate={{
    opacity: 1,
    y: 0
  }} className="space-y-2">
      {/* Title and Description */}
      
    </motion.div>;
}