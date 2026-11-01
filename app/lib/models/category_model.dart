class CategoryModel {
  final String id;
  final String name;
  final String icon;
  final String image;
  final bool isActive;

  CategoryModel({
    required this.id,
    required this.name,
    this.icon = '',
    this.image = '',
    this.isActive = true,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      icon: json['icon'] ?? '',
      image: json['image'] ?? '',
      isActive: json['isActive'] ?? true,
    );
  }
}
