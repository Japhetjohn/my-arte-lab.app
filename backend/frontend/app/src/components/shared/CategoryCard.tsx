import { Card, CardContent } from '@/components/ui/card';
import type { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  onClick?: (category: Category) => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#8A2BE2]/30 overflow-hidden h-full min-h-[180px]"
      onClick={() => onClick?.(category)}
    >
      <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-4">
        <img
          src={category.icon}
          alt={category.name}
          className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300"
        />
        <div className="w-full">
          <h3 className="font-semibold text-gray-900 group-hover:text-[#8A2BE2] transition-colors text-base">
            {category.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{category.description}</p>
          <p className="text-xs text-gray-400 mt-2">{category.creatorCount.toLocaleString()} creators</p>
        </div>
      </CardContent>
    </Card>
  );
}
