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
      <CardContent className="p-5 flex items-center gap-4">
        <img
          src={category.icon}
          alt={category.name}
          className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-300"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-[#8A2BE2] transition-colors">
            {category.name}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-1">{category.description}</p>
          <p className="text-xs text-gray-400 mt-1">{category.creatorCount.toLocaleString()} creators</p>
        </div>
      </CardContent>
    </Card>
  );
}
