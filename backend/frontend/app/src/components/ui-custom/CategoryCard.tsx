import { Card, CardContent } from '@/components/ui/card';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  onClick?: (category: Category) => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#8A2BE2]/30 overflow-hidden"
      onClick={() => onClick?.(category)}
    >
      <CardContent className="p-3 sm:p-4 lg:p-5 flex items-center gap-3 sm:gap-4">
        <img
          src={category.icon}
          alt={category.name}
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 object-contain group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-[#8A2BE2] transition-colors text-sm sm:text-base truncate">
            {category.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">{category.description}</p>
          <p className="text-xs text-gray-400 mt-0.5 sm:mt-1">{category.creatorCount.toLocaleString()} creators</p>
        </div>
      </CardContent>
    </Card>
  );
}
