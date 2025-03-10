import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { UserNav } from '@/components/user-nav';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';


export const Overview = ({ user }: { user: any }) => {
  return (
    <motion.div
      key="overview"
      className="mx-auto md:mt-20 relative"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
           {user && (
        <div className="absolute top-0 right-0 p-4">
          <UserNav user={user} />
        </div>
      )}
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center">
        <p className="flex flex-row justify-center gap-4 items-center">
          <Image
            src="/images/CWlogo.png"
            alt="CW Logo"
            width={234}
            height={78}
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </p>
        <p>
          Welcome to <strong>CW-ChatGPT</strong>, your AI assistant.
        </p>
      </div>
    </motion.div>
  );
};
