class RegisterDto {
  const RegisterDto({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
  });

  final String email;
  final String password;
  final String firstName;
  final String lastName;

  Map<String, dynamic> toJson() => {
        'email': email.trim().toLowerCase(),
        'password': password,
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
      };
}
